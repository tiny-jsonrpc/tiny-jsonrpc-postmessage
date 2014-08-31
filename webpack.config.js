'use strict';

module.exports = {
  context: __dirname + '/lib',
  entry: 'expose?TinyJSONRPCPostMessage!./tiny-jsonrpc-postmessage',
  output: {
    path: __dirname + '/dist',
    filename: 'tiny-jsonrpc-postmessage.js'
  }
}
