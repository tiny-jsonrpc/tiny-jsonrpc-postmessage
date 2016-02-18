var Server = require('tiny-jsonrpc').Server;
var global = require('bv-ui-core/lib/global');

function PostMessageServer(config) {
  Server.apply(this, arguments);

  config = config || {};

  this._allowedOrigins = config.allowedOrigins || null;

  this._client = config.client || global;

  if (this._client instanceof global.Worker) {
    this._client.addEventListener('message', this._onMessage.bind(this));
  } else {
    global.addEventListener('message', this._onMessage.bind(this));
  }
}

PostMessageServer.prototype = new Server();
PostMessageServer.prototype.constructor = PostMessageServer;

PostMessageServer.prototype._onMessage = function (e) {
  if (!e.data || !e.data.method) {
    // ignore obviously invalid messages: they're not for us
    return;
  }

  if (this._allowedOrigins && this._allowedOrigins.indexOf(e.origin) < 0) {
    // ignore messages not from an allowed origin
    return;
  }

  var that = this;
  this.respond(JSON.stringify(e.data), function (error, response) {
    if (typeof response === 'string') {
      if (e.origin) {
        that._client.postMessage(JSON.parse(response), e.origin);
      } else {
        that._client.postMessage(JSON.parse(response));
      }
    }
  });
};

module.exports = PostMessageServer;
