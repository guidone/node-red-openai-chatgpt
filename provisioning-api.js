module.exports = function(RED) {
  function ProvisioningApi(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on('input', async function (msg, send, done) {
      const keyId = config.keyId || msg.keyId;
      const keySecret = config.keySecret || msg.keySecret;
      const projectId = config.projectId || msg.projectId;
      const provisioningAction = msg.provisioningAction || config.provisioningAction;
      const payload = msg.payload;
      if (!keyId || !keySecret || !projectId) {
        node.error("Missing required parameters", msg);
        return;
      }

      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      };

      try {
        let response;
        if (provisioningAction === 'createBundle') {
        // Create Bundle
        const bundleResponse = await fetch(`https://provisioning.api.sinch.com/v1/projects/${projectId}/bundles`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        console.log("Bundle response", bundleResponse);

        if (!bundleResponse.ok) throw new Error("Bundle creation failed: ", bundleResponse.statusText);
        response = await bundleResponse.json();

        }

        if (provisioningAction === 'createRCSSender') {
        // Create RCS Sender
        const rcsResponse = await fetch(`https://provisioning.api.sinch.com/v1/projects/${projectId}/rcs/senders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        console.log("RCS Sender response", rcsResponse);

        if (!rcsResponse.ok) throw new Error("RCS sender creation failed: ", rcsResponse.statusText);
        response = await rcsResponse.json();
        }

        if (provisioningAction === 'listWebhooks') {
        // List webhooks for a provisioning bundle
        const listWebhooks = await fetch(`https://provisioning.api.sinch.com/v1/projects/${projectId}/webhooks`, {
          method: 'GET',
          headers,
        });

        console.log("RCS Sender response", listWebhooks);

        if (!listWebhooks.ok) throw new Error("List webhooks failed: ", listWebhooks.statusText);
        response = await listWebhooks.json();
        }

        if (provisioningAction === 'addWebhook') {
        // Add a webhook for a provisioning bundle
        const addWebhook = await fetch(`https://provisioning.api.sinch.com/v1/projects/${projectId}/webhooks`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        console.log("RCS Sender response", addWebhook);

        if (!addWebhook.ok) throw new Error("Failed to add webhook to bundle: ", addWebhook.statusText);
        response = await addWebhook.json();
        }

        msg.payload = response;
        send(msg);
        if (done) done();
      } catch (err) {
        node.error("Provisioning error: " + err.message, msg);
        if (done) done(err);
      }
    });
  }
  RED.nodes.registerType("provisioning-api", ProvisioningApi);
};