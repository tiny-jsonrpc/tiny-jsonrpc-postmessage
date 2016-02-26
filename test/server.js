'use strict';

var sinon = require('sinon');
var test = require('tape');

var Server = require('tiny-jsonrpc').Server;
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

        t.test('config.allowedOrigins', function (t) {
          t.doesNotThrow(function () {
            new PostMessageServer({});
          }, 'is optional');

          t.end();
        });

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

    t.test(
      'if client is a worker, listens to its `message` event',
      function (t) {
        var client = new Worker('');
        sinon.stub(client, 'addEventListener');

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

    t.test(
      'if client is not a worker, listens to global object\'s `message` event',
      function (t) {
        var client = {
          addEventListener: sinon.spy()
        };
        sinon.stub(global, 'addEventListener');

        new PostMessageServer({
          client: client
        });

        t.ok(
          !client.addEventListener.called,
          'client.addEventListener not called'
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
      var client = {};
      var messageHandler;

      sinon.stub(global, 'addEventListener', function (event, handler) {
        messageHandler = handler;
      });

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
        'does not call `this.respond` if data is an object'
      );

      messageHandler({
        data: JSON.stringify({
          foo: 'bar'
        })
      });
      t.notOk(
        server.respond.called,
        'does not call `this.respond` if no method'
      );

      global.addEventListener.restore();
      t.end();
    });

    t.test(
      'serializes the `data` property of the event and passes it to `respond`',
      function (t) {
        var client = {};
        var messageHandler;

        sinon.stub(global, 'addEventListener', function (event, handler) {
          messageHandler = handler;
        });

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
          data: JSON.stringify(data)
        });

        t.ok(server.respond.calledOnce, 'calls `this.respond`');
        t.equal(
          server.respond.firstCall.args[0],
          JSON.stringify(data),
          'passes the stringified `data` property of the event'
        );

        global.addEventListener.restore();
        t.end();
      });

    t.test(
      'if `respond` returns a string, postMessages a response to the client',
      function (t) {
        var client = {
          postMessage: sinon.stub()
        };
        var messageHandler;

        sinon.stub(global, 'addEventListener', function (event, handler) {
          messageHandler = handler;
        });

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
          data: JSON.stringify(data)
        });

        t.ok(client.postMessage.calledOnce, 'postMessages client');
        t.deepEqual(
          JSON.parse(client.postMessage.firstCall.args[0]),
          {
            jsonrpc: '2.0',
            result: 'marco',
            id: 1
          },
          'passes the parsed return value'
        );

        global.addEventListener.restore();
        t.end();
      });

    t.test('reflects event origin if specified', function (t) {
      var client = {
        postMessage: sinon.stub()
      };
      var messageHandler;

      sinon.stub(global, 'addEventListener', function (event, handler) {
        messageHandler = handler;
      });

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
        data: JSON.stringify(data),
        origin: 'http://example.com:1234'
      });

      t.equal(
        client.postMessage.firstCall.args[1],
        'http://example.com:1234',
        'reflects the event\'s origin as target origin if specified'
      );

      global.addEventListener.restore();
      t.end();
    });

    t.test('specifies no target origin if event has no origin', function (t) {
      var client = {
        postMessage: sinon.stub()
      };
      var messageHandler;

      sinon.stub(global, 'addEventListener', function (event, handler) {
        messageHandler = handler;
      });

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
        data: JSON.stringify(data)
      });

      t.equal(
        client.postMessage.firstCall.args.length,
        1,
        'specifies no target origin if event has no origin'
      );

      global.addEventListener.restore();
      t.end();
    });

    t.test('if `config.allowedOrigins` specified', function (t) {
      var client = {};
      var messageHandler;

      sinon.stub(global, 'addEventListener', function (event, handler) {
        messageHandler = handler;
      });

      var server = new PostMessageServer({
        client: client,
        allowedOrigins: [
          'https://example.com',
          'http://zombo.com:8080'
        ]
      });

      sinon.stub(server, 'respond');
      var data = {
        jsonrpc: '2.0',
        method: 'foo',
        params: []
      };

      messageHandler({
        data: JSON.stringify(data)
      });
      t.ok(!server.respond.called, 'ignores events without an origin');

      messageHandler({
        data: JSON.stringify(data),
        origin: 'https://foo.example.com'
      });
      t.ok(!server.respond.called, 'ignores events not from an allowed origin');

      messageHandler({
        data: JSON.stringify(data),
        origin: 'https://example.com'
      });
      t.ok(
        server.respond.calledOnce,
        'responds to events from an allowed origin'
      );

      global.addEventListener.restore();
      t.end();
    });

    t.end();
  });

  t.end();
});

