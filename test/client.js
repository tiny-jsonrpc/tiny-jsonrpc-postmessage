'use strict';

var sinon = require('sinon');
var test = require('tape');

var tinyJsonRpc = require('tiny-jsonrpc');
var Client = tinyJsonRpc.Client;
var tinyJsonRpcPostMessage = require('../');
var PostMessageClient = tinyJsonRpcPostMessage.Client;

test('PostMessageClient instances', function (t) {
  var mockServer = { addEventListener: function () {} };

  t.test('constructor', function (t) {
    t.test('arguments', function (t) {
      t.test('config', function (t) {
        t.doesNotThrow(function () {
          try {
            new PostMessageClient();
          } catch (e) {
            console.log(e);
            console.log(e.message);
            console.log(e.stack);

            throw e;
          }
        }, 'is optional');

        t.test('config.serverOrigin', function (t) {
          t.doesNotThrow(function () {
            new PostMessageClient({});
          }, 'is optional');

          t.end();
        });

        t.test('config.server', function (t) {
          t.doesNotThrow(function () {
            new PostMessageClient({});
          }, 'is optional');

          t.end();
        });

        t.end();
      });

      t.end();
    });

    t.test('listens to its server\'s `message` event', function (t) {
      var server = {
        addEventListener: sinon.spy()
      };

      new PostMessageClient({
        server: server
      });

      t.ok(
        server.addEventListener.calledOnce, 'server.addEventListener called');
      t.equal(
        server.addEventListener.firstCall.args[0],
        'message',
        '`message` event hooked'
      );
      t.equal(
        typeof server.addEventListener.firstCall.args[1],
        'function',
        '`message` event handler registered'
      );

      t.end();
    });

    t.end();
  });

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

    t.test('if serverOrigin set, passes it as targetOrigin to postMessage',
      function (t) {
        var server = {
          addEventListener: function () {},
          postMessage: sinon.spy()
        };

        var client = new PostMessageClient({
          server: server,
          serverOrigin: 'https://example.com'
        });

        client.request('foo');
        t.ok(server.postMessage.calledOnce, 'message posted once to server');
        t.equal(server.postMessage.firstCall.args[1], 'https://example.com');

        t.end();
      });

    t.test('if serverOrigin not set, does not pass targetOrigin to postMessage',
      function (t) {
        var server = {
          addEventListener: function () {},
          postMessage: sinon.spy()
        };

        var client = new PostMessageClient({
          server: server
        });

        client.request('foo');
        t.ok(server.postMessage.calledOnce, 'message posted once to server');
        t.equal(server.postMessage.firstCall.args.length, 1);

        t.end();
      });

    t.test('if serverOrigin set, ignore responses not from that origin',
      function (t) {
        var server = {
          addEventListener: function (event, handler) {
            messageHandler = handler;
          },
          postMessage: function (data) {
            id = data.id;
          }
        };
        var callback = sinon.spy();
        var messageHandler, id

        var client = new PostMessageClient({
          server: server,
          serverOrigin: 'https://example.com'
        });

        client.request('foo', callback);

        messageHandler({
          data: {
            jsonrpc: '2.0',
            result: 'foo',
            id: id
          }
        });

        t.ok(!callback.called, 'callback not invoked if no origin');

        messageHandler({
          origin: 'https://evil.com',
          data: {
            jsonrpc: '2.0',
            result: 'foo',
            id: id
          }
        });

        t.ok(
          !callback.called,
          'callback not invoked if origin is not serverOrigin'
        );

        messageHandler({
          origin: 'https://example.com',
          data: {
            jsonrpc: '2.0',
            result: 'foo',
            id: id
          }
        });

        t.ok(callback.calledOnce, 'callback invoked if origin is serverOrigin');

        t.end();
      });

    t.end();
  });

  t.test('inherit a notify method', function (t) {
    var client = new PostMessageClient({
      server: mockServer
    });
    t.equal(client.notify, Client.prototype.notify);

    t.test('if serverOrigin set, passes it as targetOrigin to postMessage',
      function (t) {
        var server = {
          addEventListener: function () {},
          postMessage: sinon.spy()
        };

        var client = new PostMessageClient({
          server: server,
          serverOrigin: 'https://example.com'
        });

        client.notify('foo');
        t.ok(server.postMessage.calledOnce, 'message posted once to server');
        t.equal(server.postMessage.firstCall.args[1], 'https://example.com');

        t.end();
      });

    t.test('if serverOrigin not set, does not pass targetOrigin to postMessage',
      function (t) {
        var server = {
          addEventListener: function () {},
          postMessage: sinon.spy()
        };

        var client = new PostMessageClient({
          server: server
        });

        client.notify('foo');
        t.ok(server.postMessage.calledOnce, 'message posted once to server');
        t.equal(server.postMessage.firstCall.args.length, 1);

        t.end();
      });

    t.end();
  });

  t.end();
});
