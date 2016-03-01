var Server = require('tiny-jsonrpc').Server;
var global = require('bv-ui-core/lib/global');

function PostMessageServer(config) {
  Server.apply(this, arguments);

  config = config || {};

  this._allowedOrigins = config.allowedOrigins || null;

  this._client = config.client || global;

  if (global.Worker && this._client instanceof global.Worker) {
    this._client.addEventListener('message', this._onMessage.bind(this));
  } else {
    global.addEventListener('message', this._onMessage.bind(this));
  }
}

PostMessageServer.prototype = new Server();
PostMessageServer.prototype.constructor = PostMessageServer;

PostMessageServer.prototype._onMessage = function (e) {
  var data;

  if (this._client !== e.source) {
    // ignore messages not from specified client
    return;
  }

  try {
    data = JSON.parse(e.data);
  } catch (e) {
    // ignore messages with data that isn't stringified: they're not for us
    return;
  }

  if (!data.method) {
    // ignore messages without a method
    return;
  }

  if (this._allowedOrigins && this._allowedOrigins.indexOf(e.origin) < 0) {
    // ignore messages not from an allowed origin
    return;
  }

  var that = this;
  this.respond(JSON.stringify(data), function (error, response) {
    var id = parseInt(data.id, 10);

    // response is a string and the request id was a number
    if (typeof response === 'string' && id === id) {
      // send message as a string for IE9
      if (e.origin) {
        that._client.postMessage(response, e.origin);
      } else {
        that._client.postMessage(response);
      }
    }
  });
};

module.exports = PostMessageServer;
