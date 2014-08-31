var Server = require('tiny-jsonrpc/lib/tiny-jsonrpc/server');
var util = require('tiny-jsonrpc/lib/tiny-jsonrpc/util');
var global = this;

function PostMessageServer(options) {
  Server.apply(this, arguments);
  this._client = options.client || global;
  this._client.addEventListener('message', this._onMessage.bind(this));
}

PostMessageServer.prototype = new Server();
PostMessageServer.prototype.constructor = PostMessageServer;

PostMessageServer.prototype._onMessage = function (e) {
  if (!e.data || !e.data.method) {
    // ignore obviously invalid messages: they're not for us
    return;
  }

  var result = this.respond(JSON.stringify(e.data));

  if (typeof result === 'string') {
    this._client.postMessage(JSON.parse(result));
  }
};

module.exports = PostMessageServer;
