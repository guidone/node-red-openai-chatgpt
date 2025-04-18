const OpenAI = require('openai');

const tryParse = require('./helpers/try-parse');
const isFunctionResponse = require('./helpers/is-function-response');
const processOutputs = require('./helpers/process-outputs');
const resolver = require('./helpers/resolver');
const updateTokens = require('./helpers/update-tokens');
const GPTContext = require('./helpers/gpt-context');

// DOCS:
// UI element for dialog
// https://nodered.org/docs/creating-nodes/edit-dialog
//
// OpenAPI function calls
// https://platform.openai.com/docs/guides/function-calling?api-mode=responses&strict-mode=enabled#function-calling-steps
//
// OpenAPI responses API
// https://platform.openai.com/docs/api-reference/responses/create
//
// OpenAPI conversation state
// https://platform.openai.com/docs/guides/conversation-state?api-mode=responses

module.exports = function(RED) {
  function ChatGPTResponses(config) {
    RED.nodes.createNode(this,config);
    const node = this;
    node.prompt = config.prompt;
    node.sessionKey = config.sessionKey;
    node.sessionKeyType = config.sessionKeyType;
    node.messageKey = config.messageKey;
    node.messageKeyType = config.messageKeyType;
    let openai;

    // Retrieve the config node
    this.openAIKey = RED.nodes.getNode(config.openAIKey);
    // Init openai
    if (this.openAIKey && this.openAIKey.credentials?.apiKey) {
      openai = new OpenAI({
        apiKey: this.openAIKey.credentials.apiKey
      });
    } else {
      node.error('Invalid or missing OpenAI API key');
      return;
    }

    node.on('input', async function(msg, send, done) {

      const promptDesign = tryParse(node.prompt);
      if (!promptDesign) {
        node.error('Invalid prompt');
        return;
      }

      // resolve session and message payload
      const sessionId = resolver(node.sessionKey, node.sessionKeyType, { msg, node });
      const inputMessage = resolver(node.messageKey, node.messageKeyType, { msg, node });
      console.log('Resolved content: sessionId: ', sessionId, 'message: ', inputMessage);

      const context = GPTContext({ context: this.context().flow, sessionId });

      // Warn if empty session id
      if (!sessionId) {
        node.warn(`Was not possible to extract a session id from msg payload, a session will not be created it will not be possible to follow up messages with ChatGPT`);
      }

      const session = await context.getSession(sessionId);
      console.log('current session', session);

      // prepare the call to openAI
      let response;
      if (isFunctionResponse(msg)) {

        // HAMDLE MESSAGE RESPONSE
        console.log('answering to ', msg['chatgpt-function-call']);
        console.log('');

        const gptRequest = {
          ...promptDesign,
          input: [
            {
              type: 'function_call_output',
              call_id: msg['chatgpt-function-call'].call_id,
              output: msg.payload ? msg.payload.toString() : ''
            }
          ],
          previous_response_id: msg['chatgpt-function-call'].previousId,
          // override store flag
          store: true,
          tool_choice: 'auto'
        };

        console.log('Func gptRequest', gptRequest);

        // execute call
        try {
          response = await openai.responses.create(gptRequest);
        } catch(e) {
          done(e);
          return;
        }

      } else {

        const gptRequest = {
          ...promptDesign,
          input: [
            ...(promptDesign.input ? promptDesign.input : []),
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: inputMessage
                }
              ]
            }
          ],
          // override store flag
          store: true,
          tool_choice: 'auto'
        };

        // set previous
        if (session) {
          gptRequest.previous_response_id = session.previousId;
        }

        console.log('Bare gptRequest', gptRequest);
        // execute call
        try {
          response = await openai.responses.create(gptRequest);
        } catch(e) {
          done(e);
          return;
        }
      }

      // update status
      updateTokens(node, response);

      // create or update current session
      if (!session) {
        // if no session identifier, do nothing
        if (sessionId) {
          await context.createSession({
            sessionId,
            previousId: response.id
          });
        }
      } else {
        // session exists, update it
        await context.updateSession(sessionId, { previousId: response.id });
      }

      send(processOutputs(response.output, promptDesign, msg, response));
      done();
    });
  }

  RED.nodes.registerType('chat-gpt-responses', ChatGPTResponses);
};
