var Client = require('tiny-jsonrpc/lib/tiny-jsonrpc/client');
var util = require('tiny-jsonrpc/lib/tiny-jsonrpc/util');
var global = this;

function PostMessageClient(options) {
  options.server = options.server || global;
  Client.apply(this, arguments);

  this._callbacks = {};
  this._server.addEventListener('message', this._onMessage.bind(this));
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

  this._server.postMessage(request);
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

  var response = e.data;

  if (!util.isUndefined(response.id) && this._callbacks[response.id]) {
    this._callbacks[response.id](response.error || null,
      response.result || null);
    delete this._callbacks[response.id];
  }
};

module.exports = PostMessageClient;
