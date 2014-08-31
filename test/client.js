'use strict';

var test = require('tape');

var tinyJsonRpc = require('tiny-jsonrpc');
var Client = tinyJsonRpc.Client;
var tinyJsonRpcPostMessage = require('../');
var PostMessageClient = tinyJsonRpcPostMessage.Client;

test('PostMessageClient instances', function (t) {
  var mockServer = { addEventListener: function () {} };

  t.test('are instances of Client', function (t) {
    var client = new PostMessageClient({
      server: mockServer
    });

    t.ok(client instanceof Client);

    t.end();
  });

  t.test('provide a request method', function (t) {
    var client = new PostMessageClient({
      server: mockServer
    });
    t.ok(client.request instanceof Function);

    t.end();
  });

  t.test('inherit a notify method', function (t) {
    var client = new PostMessageClient({
      server: mockServer
    });
    t.equal(client.notify, Client.prototype.notify);

    t.end();
  });

  t.end();
});
