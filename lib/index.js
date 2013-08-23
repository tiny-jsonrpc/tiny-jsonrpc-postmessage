define([
  './tiny-jsonrpc-postmessage/client',
  './tiny-jsonrpc-postmessage/server'
],
function (
  Client,
  Server
) {
  return {
    Client: Client,
    Server: Server
  };
});
