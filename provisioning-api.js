const tryParse = require('./helpers/try-parse');
module.exports = function (RED) {
  function ProvisioningApi(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on("input", async function (msg, send, done) {
      const keyId = msg.keyId || config.keyId;
      const keySecret = msg.keySecret || config.keySecret;
      const projectId = msg.projectId || config.projectId;
      const senderId = msg.senderId || config.senderId;
      const testNumber = msg.testNumber || config.testNumber;
      const payload = msg.payload || config.payload;
      const provisioningAction =
        msg.provisioningAction || config.provisioningAction;
      if (!keyId || !keySecret) {
        node.error("Missing required parameters", msg);
        return;
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
          if (!projectId) {
            node.error("Missing projectId", msg);
            done();
          }
          const bundleResponse = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/bundles`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(tryParse(payload)),
            }
          );

          console.log("Bundle response", bundleResponse);

          if (!bundleResponse.ok)
            throw new Error(
              "Bundle creation failed: ",
              bundleResponse.statusText
            );
          response = await bundleResponse.json();
        }
        // Create RCS Sender
        if (provisioningAction === "createRCSSender") {
          if (!projectId) {
            node.error("Missing projectId", msg);
            done();
          }
          const rcsResponse = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/rcs/senders`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(tryParse(payload)),
            }
          );

          console.log("RCS Sender response", rcsResponse);

          if (!rcsResponse.ok)
            throw new Error(
              "RCS sender creation failed: ",
              rcsResponse.statusText
            );
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

          console.log("List webhooks response", listWebhooks);

          if (!listWebhooks.ok)
            throw new Error("List webhooks failed: ", listWebhooks.statusText);
          response = await listWebhooks.json();
        }

        // Add a webhook for a provisioning bundle
        if (provisioningAction === "addWebhook") {
          if (!projectId) {
            node.error("Missing projectId", msg);
            done();
          }
          console.log("payload", payload);
          const addWebhook = await fetch(
            `https://provisioning.api.sinch.com/v1/projects/${projectId}/webhooks`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(tryParse(payload)),
            }
          );

          console.log("addWebhook responses", addWebhook);

          if (!addWebhook.ok)
            throw new Error(
              "Failed to add webhook to bundle: ",
              addWebhook.statusText
            );
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
              body: JSON.stringify(tryParse(payload)),
            }
          );

          console.log("addTestNumber responses", addTestNumber);

          if (!addTestNumber.ok)
            throw new Error(
              "Failed to add webhook to bundle: ",
              addTestNumber.statusText
            );
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

          console.log("makeMeTester responses", makeMeTester);

          if (!makeMeTester.ok)
            throw new Error(
              "Failed to add webhook to bundle: ",
              makeMeTester.statusText
            );
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
              body: JSON.stringify(tryParse(payload)),
            }
          );

          console.log("addCommentRCSSender responses", addCommentRCSSender);

          if (!addCommentRCSSender.ok)
            throw new Error(
              "Failed to add webhook to bundle: ",
              addCommentRCSSender.statusText
            );
          response = await addCommentRCSSender.json();
        }

        msg.payload = response;
        send([msg, null]);
        if (done) done();
      } catch (err) {
        node.error("Provisioning error: " + err.message, msg);
        send([null, {...msg, error: err.message }]);
        if (done) done(err);
      }
    });
  }
  RED.nodes.registerType("provisioning-api", ProvisioningApi);
};
