const tryParse = require("./helpers/try-parse");
module.exports = function (RED) {
  function ProvisioningApi(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on("input", async function (msg, send, done) {
      const projectId = msg.projectId || config.projectId;
      const senderId = msg.senderId || config.senderId;
      const testNumber = msg.testNumber || config.testNumber;
      const payload = msg.payload;
      const provisioningAction =
        msg.provisioningAction || config.provisioningAction;

      // Retrieve the config node
      this.papiCredentials = RED.nodes.getNode(config.papiCredentials);
      const keyId = this.papiCredentials.config.keyId;
      const keySecret = this.papiCredentials.credentials.keySecret;

      if (!keyId || !keySecret) {
        node.error("Invalid or missing Sinch API key", msg);
        done();
      }

      const authHeader =
        "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const headers = {
        "Content-Type": "application/json",
        Authorization: authHeader,
      };

      try {
        let response;

        // Create Bundle
        if (provisioningAction === "createBundle") {
          if (!projectId || !payload) {
            node.error("Missing projectId or payload", msg);
            done();
          }
          const bundleResponse = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/bundles`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
            }
          );

          if (!bundleResponse.ok) {
            const errorBody = await bundleResponse.json();
            throw new Error(
              `Bundle creation failed: 
              ${errorBody.resolution}`
            );
          }
          response = await bundleResponse.json();
        }
        // Create RCS Sender
        if (provisioningAction === "createRCSSender") {
          if (!projectId || !payload) {
            node.error("Missing projectId or payload", msg);
            done();
          }
          const rcsResponse = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/rcs/senders`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
            }
          );

          if (!rcsResponse.ok) {
            const errorBody = await rcsResponse.json();
            throw new Error(
              `RCS sender creation failed: 
              ${errorBody.resolution}`
            );
          }
          response = await rcsResponse.json();
        }

        // List webhooks for a provisioning bundle
        if (provisioningAction === "listWebhooks") {
          if (!projectId) {
            node.error("Missing projectId", msg);
            done();
          }
          const listWebhooks = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/webhooks`,
            {
              method: "GET",
              headers,
            }
          );

          if (!listWebhooks.ok) {
            const errorBody = await listWebhooks.json();
            throw new Error(
              `List webhooks failed: 
              ${errorBody.resolution}`
            );
          }
          response = await listWebhooks.json();
        }

        // Add a webhook for a provisioning bundle
        if (provisioningAction === "addWebhook") {
          if (!projectId || !payload) {
            node.error("Missing projectId or payload", msg);
            done();
          }
          const addWebhook = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/webhooks`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
            }
          );

          if (!addWebhook.ok) {
            const errorBody = await addWebhook.json();
            throw new Error(
              `Add webhook failed: 
              ${errorBody.resolution}`
            );
        }
          response = await addWebhook.json();
        }

        // Add a test number to an RCS sender
        if (provisioningAction === "addTestNumber") {
          if (!projectId || !senderId) {
            node.error("Missing projectId or senderId", msg);
            done();
          }
          const addTestNumber = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/rcs/senders/${senderId}/testNumber`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
            }
          );

          if (!addTestNumber.ok) {
            const errorBody = await addTestNumber.json();
            throw new Error(
              `Add test number failed: 
              ${errorBody.resolution}`
            );
          }
          response = await addTestNumber.json();
        }

        // Trigger retry of make me a tester message
        if (provisioningAction === "makeMeTester") {
          if (!projectId || !senderId || !testNumber) {
            node.error("Missing projectId, senderId or testNumber", msg);
            done();
          }
          const makeMeTester = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/rcs/senders/${senderId}/testNumbers/${testNumber}/retry`,
            {
              method: "GET",
              headers,
            }
          );

          if (!makeMeTester.ok) {
            const errorBody = await makeMeTester.json();
            throw new Error(
              `Make me tester failed: 
              ${errorBody.resolution}`
            );
          }
          response = await makeMeTester.json();
        }

        // Add comment to a RCS sender
        if (provisioningAction === "addCommentRCSSender") {
          if (!projectId || !senderId) {
            node.error("Missing projectId or senderId", msg);
            done();
          }
          const addCommentRCSSender = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/rcs/senders/${senderId}/comments`,
            {
              method: "GET",
              headers,
              body: JSON.stringify(payload),
            }
          );

          if (!addCommentRCSSender.ok) {
            const errorBody = await addCommentRCSSender.json();
            throw new Error(
              `Add comment to RCS sender failed: 
              ${errorBody.resolution}`
            );
          }
          response = await addCommentRCSSender.json();
        }
        node.log("Provisioning response: ", response);
        msg.payload = response;
        send([msg, null]);
        if (done) done();
      } catch (err) {
        node.error("Provisioning error: " + err.message, msg);
        send([null, { ...msg, error: err.message }]);
        if (done) done(err);
      }
    });
  }
  RED.nodes.registerType("provisioning-api", ProvisioningApi);
};
