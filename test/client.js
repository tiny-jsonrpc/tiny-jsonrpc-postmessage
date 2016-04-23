'use strict';

var sinon = require('sinon');
var test = require('tape');

var global = require('bv-ui-core/lib/global');
var Client = require('tiny-jsonrpc').Client;
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

    t.test(
      'if server is a worker, listens to its `message` event',
      function (t) {
        var server = new Worker('');
        sinon.stub(server, 'addEventListener');

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

    t.test(
      'if server is not a worker, listens to global object\'s `message` event',
      function (t) {
        var server = {
          addEventListener: sinon.spy()
        };
        sinon.stub(global, 'addEventListener');

        new PostMessageClient({
          server: server
        });

        t.ok(
          !server.addEventListener.called,
          'server.addEventListener not called'
        );
        t.ok(
          global.addEventListener.calledOnce,
          'global.addEventListener called'
        );
        t.equal(
          global.addEventListener.firstCall.args[0],
          'message',
          '`message` event hooked'
        );
        t.equal(
          typeof global.addEventListener.firstCall.args[1],
          'function',
          '`message` event handler registered'
        );

        global.addEventListener.restore();
        t.end();
      });

      t.test('listener', function (t) {
        var server = {
          postMessage: function (data) {
            id = JSON.parse(data).id;
          }
        };
        var callback = sinon.spy();
        var messageHandler, id, data;

        sinon.stub(global, 'addEventListener', function (event, handler) {
          messageHandler = handler;
        });

        var client = new PostMessageClient({
          server: server,
          serverOrigin: 'https://example.com'
        });

        t.test('ignores messages where `e.data` cannot be parsed as JSON',
          function (t) {
            t.doesNotThrow(function () {
              messageHandler({
                data: ','
              });
            });
            t.end();
          });

        t.test('ignores messages where `e.data` does not parse to an object',
          function (t) {
            t.doesNotThrow(function () {
              messageHandler({
                data: 'null'
              });
            });
            t.end();
          });

        t.test('ignores messages where `e.data` is not an object',
          function (t) {
            t.doesNotThrow(function () {
              messageHandler({
                data: JSON.stringify({})
              });
            });
            t.end();
          });

        global.addEventListener.restore();
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
          postMessage: function (data) {
            id = JSON.parse(data).id;
          }
        };
        var callback = sinon.spy();
        var messageHandler, id, data;

        sinon.stub(global, 'addEventListener', function (event, handler) {
          messageHandler = handler;
        });

        var client = new PostMessageClient({
          server: server,
          serverOrigin: 'https://example.com'
        });

        client.request('foo', callback);

        data = {
          jsonrpc: '2.0',
          result: 'foo',
          id: id
        };

        messageHandler({
          data: JSON.stringify(data)
        });

        t.ok(!callback.called, 'callback not invoked if no origin');

        data = {
          jsonrpc: '2.0',
          result: 'foo',
          id: id
        };

        messageHandler({
          origin: 'https://evil.com',
          data: JSON.stringify(data)
        });

        t.ok(
          !callback.called,
          'callback not invoked if origin is not serverOrigin'
        );

        data = {
          jsonrpc: '2.0',
          result: 'foo',
          id: id
        };

        messageHandler({
          origin: 'https://example.com',
          data: JSON.stringify(data)
        });

        t.ok(callback.calledOnce, 'callback invoked if origin is serverOrigin');

        global.addEventListener.restore();
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
