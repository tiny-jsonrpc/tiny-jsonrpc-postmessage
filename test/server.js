'use strict';

var sinon = require('sinon');
var test = require('tape');

var tinyJsonRpc = require('tiny-jsonrpc');
var Server = tinyJsonRpc.Server;
var tinyJsonRpcPostMessage = require('../');
var PostMessageServer = tinyJsonRpcPostMessage.Server;

test('PostMessageServer instances', function (t) {
  var mockClient = { addEventListener: function () {} };

  t.test('constructor', function (t) {
    t.test('arguments', function (t) {
      t.test('config', function (t) {
        t.doesNotThrow(function () {
          new PostMessageServer();
        }, 'is optional');

        t.test('config.client', function (t) {
          t.doesNotThrow(function () {
            new PostMessageServer({});
          }, 'is optional');

          t.end();
        });

        t.end();
      });

      t.end();
    });

    t.test('listens to its client\'s `message` event', function (t) {
      var client = {
        addEventListener: sinon.spy()
      };

      new PostMessageServer({
        client: client
      });

      t.ok(
        client.addEventListener.calledOnce, 'client.addEventListener called');
      t.equal(
        client.addEventListener.firstCall.args[0],
        'message',
        '`message` event hooked'
      );
      t.equal(
        typeof client.addEventListener.firstCall.args[1],
        'function',
        '`message` event handler registered'
      );

      t.end();
    });

    t.end();
  });

  t.test('are instances of Server', function (t) {
    t.ok(new PostMessageServer({
      client: mockClient
    }) instanceof Server);
    t.end();
  });

  t.test('inherit a respond method', function (t) {
    var server = new PostMessageServer({
      client: mockClient
    });
    t.equal(server.respond, Server.prototype.respond);
    t.end();
  });

  t.test('inherit a provide method', function (t) {
    var server = new PostMessageServer({
      client: mockClient
    });
    t.equal(server.provide, Server.prototype.provide);
    t.end();
  });

  t.test('inherit a revoke method', function (t) {
    var server = new PostMessageServer({
      client: mockClient
    });
    t.equal(server.revoke, Server.prototype.revoke);
    t.end();
  });

  t.test('inherit a provides method', function (t) {
    var server = new PostMessageServer({
      client: mockClient
    });
    t.equal(server.provides, Server.prototype.provides);
    t.end();
  });

  t.test('on a client `message` event', function (t) {
    t.test('ignores malformed events', function (t) {
      var client = {
        addEventListener: function (event, handler) {
          messageHandler = handler;
        }
      };
      var messageHandler;

      var server = new PostMessageServer({
        client: client
      });

      sinon.stub(server, 'respond');

      messageHandler({});
      t.notOk(
        server.respond.called,
        'does not call `this.respond` if no data'
      );

      messageHandler({
        data: {
          foo: 'bar'
        }
      });
      t.notOk(
        server.respond.called,
        'does not call `this.respond` if no method'
      );

      t.end();
    });

    t.test(
      'serializes the `data` property of the event and passes it to `respond`',
      function (t) {
        var client = {
          addEventListener: function (event, handler) {
            messageHandler = handler;
          }
        };
        var messageHandler;

        var server = new PostMessageServer({
          client: client
        });

        sinon.stub(server, 'respond');
        var data = {
          jsonrpc: '2.0',
          method: 'foo',
          params: []
        };
        messageHandler({
          data: data
        });

        t.ok(server.respond.calledOnce, 'calls `this.respond`');
        t.equal(
          server.respond.firstCall.args[0],
          JSON.stringify(data),
          'passes the stringified `data` property of the event'
        );

        t.end();
      });

    t.test(
      'if `respond` returns a string, postMessages a response to the client',
      function (t) {
        var client = {
          addEventListener: function (event, handler) {
            messageHandler = handler;
          },
          postMessage: sinon.stub()
        };
        var messageHandler;

        var server = new PostMessageServer({
          client: client
        });

        server.provide(function echo(data) {
          return data;
        });

        var data = {
          jsonrpc: '2.0',
          method: 'echo',
          params: ['marco'],
          id: 1
        };
        messageHandler({
          data: data
        });

        t.ok(client.postMessage.calledOnce, 'postMessages client');
        t.deepEqual(
          client.postMessage.firstCall.args[0],
          {
            jsonrpc: '2.0',
            result: 'marco',
            id: 1
          },
          'passes the parsed return value'
        );

        t.end();

      });

    t.end();
  });

  t.end();
});

