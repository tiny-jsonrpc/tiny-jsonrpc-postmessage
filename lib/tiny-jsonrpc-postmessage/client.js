var Client = require('tiny-jsonrpc/lib/tiny-jsonrpc/client');
var util = require('tiny-jsonrpc/lib/tiny-jsonrpc/util');
var global = require('bv-ui-core/lib/global');

function PostMessageClient(config) {
  config = config || {};
  config.server = config.server || global;

  Client.call(this, config);

  this._callbacks = {};
  this._serverOrigin = config.serverOrigin || null;

  if (this._server instanceof global.Worker) {
    this._server.addEventListener('message', this._onMessage.bind(this));
  } else {
    global.addEventListener('message', this._onMessage.bind(this));
  }
}

PostMessageClient.prototype = new Client({
  server: true
});
PostMessageClient.prototype.constructor = PostMessageClient;

PostMessageClient.prototype._send = function (request) {
  var success;

  try {
    JSON.stringify(request);
  } catch (e) {
    throw 'Could not serialize request to JSON';
  }

  if (this._serverOrigin) {
    this._server.postMessage(request, this._serverOrigin);
  } else {
    this._server.postMessage(request);
  }
};

PostMessageClient.prototype.request = function () {
  var request = this._makeRequest.apply(this, arguments);
  var callback;
  var response;

  request.id = this._nextId++;

  if (request.callback) {
    callback = request.callback;
    delete request.callback;
  } else if (util.isArray(request.params) &&
    util.isFunction(request.params[request.params.length - 1])
  ) {
    callback = request.params.pop();
  }

  this._send(request);

  if (callback && util.isNumber(request.id)) {
    this._callbacks[request.id] = callback;
  }
};

PostMessageClient.prototype._onMessage = function (e) {
  if (!e.data || (!e.data.result && !e.data.error)) {
    // ignore obviously invalid messages: they're not for us
    return;
  }

  if (this._serverOrigin && e.origin !== this._serverOrigin) {
    // ignore messages not from our server's origin
    return;
  }

  var response = e.data;

  if (!util.isUndefined(response.id) && this._callbacks[response.id]) {
    this._callbacks[response.id](response.error || null,
      response.result || null);
    delete this._callbacks[response.id];
  }
};

module.exports = PostMessageClient;
