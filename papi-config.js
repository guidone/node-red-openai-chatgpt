module.exports = function(RED) {
  function PapiConfig(config) {
      RED.nodes.createNode(this,config);
      this.config = config;
  }
  RED.nodes.registerType(
    'papi-config',
    PapiConfig,
    {
      credentials: {
        keySecret: { type: 'password' }
      }
    }
  );
}