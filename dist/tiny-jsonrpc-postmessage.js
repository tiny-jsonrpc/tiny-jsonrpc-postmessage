(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define(factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.libGlobalName = factory();
    }
}(this, function () {

/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

;(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('tiny-jsonrpc/util',factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.util = factory();
    }
}(this, function () {
    function defaults(a, b) {
        for (var key in b) {
            if (!a.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }

        return a;
    }

    function merge(a, b) {
        for (var key in b) {
            a[key] = b[key];
        }

        return a;
    }

    function clone(o) {
        return defaults({}, o);
    }

    function toArray(x) {
        return Array.prototype.slice.call(x);
    }

    function isNumber(x) { return typeof x === 'number'; }
    function isString(x) { return typeof x === 'string'; }
    function isFunction(x) { return typeof x === 'function'; }
    function isArray(x) { return x instanceof Array; }
    function isObject(x) { return typeof x === 'object'; }
    function isNull(x) { return x === null; }
    function isUndefined(x) { return x === void undefined; }

    // https://developer.mozilla.org/en-US/docs/JavaScript/
    //         Reference/Global_Objects/Function/bind
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (oThis) {
            if (typeof this !== 'function') {
                // closest thing possible to the ECMAScript 5 internal
                // IsCallable function
                throw new TypeError('Function.prototype.bind - ' +
                    'what is trying to be bound is not callable');
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () {},
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP && oThis
                         ? this
                         : oThis,
                         aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();

            return fBound;
        };
    }

    return {
        defaults: defaults,
        merge: merge,
        clone: clone,
        toArray: toArray,
        isNumber: isNumber,
        isString: isString,
        isFunction: isFunction,
        isArray: isArray,
        isObject: isObject,
        isNull: isNull,
        isUndefined: isUndefined
    };
}));

;(function (root, factory) {
    var requireBase = '.';

    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.

        // PhantomJS support
        requireBase = typeof phantom !== 'undefined' && phantom.requireBase ?
            phantom.requireBase + '/tiny-jsonrpc/lib/tiny-jsonrpc' :
            requireBase;

        module.exports = factory(require(requireBase + '/util'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('tiny-jsonrpc/client',['./util'], factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.Client = factory(tinyJsonRpc.util);
    }
}(this, function (util) {
    var defaultConfig = {};

    function Client(options) {
        this.options = options =
            util.clone(util.defaults(options || {}, defaultConfig));

        if (!options.server) {
            throw 'The server config option is required';
        }

        this._server = options.server;
        this._nextId = 0;
    }

    Client.prototype._makeRequest = function () {
        var method, params, callback, id;
        var args = Array.prototype.slice.call(arguments);
        var lastArg = args.length - 1;
        var request = {
            jsonrpc: '2.0'
        };

        if (util.isObject(args[0]) &&
            !util.isUndefined(args[0]) && !util.isNull(args[0])
        ) {
            // called with a config object
            method = args[0].method;
            params = args[0].params;
            request.callback = args[0].callback;
        } else {
            // called with a method name and optional params and callback
            method = args[0];
            params = args.slice(1);
        }

        if (!util.isString(method)) {
            throw 'Method must be a string';
        }

        if (params === null ||
            (!util.isArray(params) && !util.isObject(params))
        ) {
            throw 'Params must be an object or array';
        }

        request.method = method;
        if (params) {
            request.params = params;
        }

        return request;
    };

    Client.prototype._send = function (request) {
        try {
            request = JSON.stringify(request);
        } catch (e) {
            throw 'Could not serialize request to JSON';
        }

        return JSON.parse(this._server.respond(request));
    };

    Client.prototype.request = function () {
        var request = this._makeRequest.apply(this, arguments);
        var callback;
        var response;

        request.id = this._nextId++;

        if (request.callback) {
            callback = request.callback
            delete request.callback;
        } else if (util.isArray(request.params) &&
            util.isFunction(request.params[request.params.length - 1])
        ) {
            callback = request.params.pop();
        }

        response = this._send(request);

        if (callback) {
            callback(response.error || null, response.result || null);
        }
    };

    Client.prototype.notify = function () {
        var request = this._makeRequest.apply(this, arguments);

        delete request.callback;

        this._send(request);
    };

    function parseArgs(args) {
        args = args.split(/,\s*/);
        var result = {};

        for (var i = 0; i < args.length; i++) {
            result[args[i]] = i;
        }

        return result;
    }

    function keys(o) {
        if (Object.prototype.keys) {
            return o.keys();
        }

        var result = [];
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                result.push(k);
            }
        }

        return result;
    }

    return Client;
}));

define('tiny-jsonrpc-postmessage/client',[
  'tiny-jsonrpc/client',
  'tiny-jsonrpc/util'
],
function (
  Client,
  util
) {
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

    return PostMessageClient;
});

;(function (root, factory) {
    var requireBase = '.';

    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.

        // PhantomJS support
        requireBase = typeof phantom !== 'undefined' && phantom.requireBase ?
            phantom.requireBase + '/tiny-jsonrpc/lib/tiny-jsonrpc' :
            requireBase;

        module.exports = factory(require(requireBase + '/util'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('tiny-jsonrpc/server',['./util'], factory);
    } else {
        // Browser globals
        root.tinyJsonRpc = root.tinyJsonRpc || {};
        root.tinyJsonRpc.Server = factory(tinyJsonRpc.util);
    }
}(this, function (util) {
    var defaultConfig = {};

    function Server(options) {
        this.options = options =
            util.clone(util.defaults(options || {}, defaultConfig));

        this._methods = {};
    }

    Server.prototype.errors = {
        PARSE_ERROR: -32700,
        INVALID_REQUEST: -32600,
        METHOD_NOT_FOUND: -32601,
        INVALID_PARAMS: -32602,
        INTERNAL_ERROR: -32603
    };

    // TODO: real error messages here
    Server.prototype.errorMessages = (function () {
        var msgs = {};
        var errs = Server.prototype.errors;
        for (var k in errs) {
            msgs[errs[k]] = k;
        }
        return msgs;
    }());

    function parseArgs(args) {
        args = args.split(/,\s*/);
        var result = {};

        for (var i = 0; i < args.length; i++) {
            result[args[i]] = i;
        }

        return result;
    }

    function functionSnippet(fn) {
        return fn.toString().slice(0, 20) + '...';
    }

    function parseFunction(fn) {
        var parsed = fn.toString().match(/function\s+(\w+)?\((.*)\)/);

        if (!parsed) {
            throw 'Cannot parse function: ' + functionSnippet(fn);
        }

        return {
            fn: fn,
            name: parsed[1],
            args: parseArgs(parsed[2])
        };
    }

    Server.prototype._provide = function (toProvide, fn, name) {
        var fnRecord = parseFunction(fn);

        fnRecord.name = name || fnRecord.name;

        if (!fnRecord.name) {
            throw 'Cannot provide anonymous function: ' + functionSnippet(fn);
        }

        if (this._methods[fnRecord.name] || toProvide[fnRecord.name]) {
            throw 'Cannot provide duplicate function ' + fnRecord.name;
        }

        toProvide[fnRecord.name] = fnRecord;
    };

    Server.prototype.provide = function () {
        var args = util.toArray(arguments);
        var toProvide = {};
        var method;

        args.forEach(function (x) {
            if (util.isFunction(x)) {
                method = this._provide(toProvide, x);
            } else if (util.isObject(x)) {
                for (var k in x) {
                    if (util.isFunction(x[k])) {
                        this._provide(toProvide, x[k], k);
                    }
                }
            } else {
                throw 'Cannot provide illegal argument: ' + x;
            }
        }, this);

        util.merge(this._methods, toProvide);
    };

    Server.prototype.revoke = function () {
        var args = util.toArray(arguments);

        for (var i = 0; i < args.length; i++) {
            delete this._methods[args[i]];
        }
    };

    function keys(o) {
        if (Object.prototype.keys) {
            return o.keys();
        }

        var result = [];
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                result.push(k);
            }
        }

        return result;
    }

    Server.prototype.provides = function (method) {
        if (util.isUndefined(method)) {
            return keys(this._methods);
        }

        return this._methods.hasOwnProperty(method);
    };

    Server.prototype.makeError = function(id, message, code, data) {
        var error;
        var response;

        if (util.isNumber(message)) {
            data = code;
            code = message;
            message = this.errorMessages[code];
        }

        if (!util.isNumber(code)) {
            code = this.errors.INTERNAL_ERROR;
        }

        error = { id: id, code: code, message: message };

        if (!util.isUndefined(data)) {
            error.data = data;
        }

        if (util.isNumber(id) || util.isString(id) || id === null) {
            response = {
                jsonrpc: '2.0',
                id: id
            };
            response.error = error;
            return response;
        } else {
            response = new Error(message);
            response.code = code;

            if (!util.isUndefined(data)) {
                response.data = data;
            }

            return response;
        }
    };

    Server.prototype.makeResponse = function (id, result) {
        var response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };

        return util.isString(id) || util.isNumber(id) || id === null ?
            response : null;
    };

    /**
     * Transform named arguments to an args array
     *
     * Missing args are undefined.
     */
    function marshal(params, method) {
        var result = [];

        if (util.isArray(params)) {
            result = params;
        } else if (params) {
            for (var k in params) {
                if (util.isNumber(method.args[k])) {
                    result[method.args[k]] = params[k];
                }
            }
        }

        return result;
    }

    Server.prototype.respond = function (request) {
        var code, response, results;

        // parse the payload
        try {
            request = JSON.parse(request, this.options.reviver);
        } catch (e) {
            return JSON.stringify(
                this.makeError(null, this.errors.PARSE_ERROR, e));
        }

        // is it a batch request?
        if (util.isArray(request)) {
            if (request.length < 1) {
                // empty batch requests are invalid
                return JSON.stringify(
                    this.makeError(null, this.errors.INVALID_REQUEST));
            }

            results = [];
            for (var i = 0; i < request.length; i++) {
                response = this._respond(request[i]);

                if (response !== null && !(response instanceof Error)) {
                    // if it's an actual response, send it
                    results.push(response);
                }
            }

            if (results.length < 1) {
                // don't respond if everything was notifications
                results = null;
            }
        } else {
            results = this._respond(request);
        }

        return results !== null && !(results instanceof Error) ?
            JSON.stringify(results) : results;
    };

    Server.prototype._respond = function (request) {
        var code;

        if (!util.isUndefined(request.id) &&
            !util.isNull(request.id) &&
            !util.isString(request.id) &&
            !util.isNumber(request.id)
        ) {
            return this.makeError(null, this.errors.INVALID_REQUEST);
        }

        // is it a valid request?
        if (request.jsonrpc !== '2.0' ||
            !util.isString(request.method) ||
            (
                !util.isUndefined(request.params) &&
                !util.isArray(request.params) &&
                !util.isObject(request.params)
            )
        ) {
            return this.makeError(util.isUndefined(request.id) ?
                null : request.id,
                this.errors.INVALID_REQUEST);
        }

        // coolbro. handle it.
        var method = this._methods[request.method];
        if (!method) {
            return this.makeError(request.id, this.errors.METHOD_NOT_FOUND);
        }

        try {
            return this.makeResponse(request.id,
                method.fn.apply(null, marshal(request.params, method))
            );
        } catch (e) {
            code = util.isNumber(e.code) ? e.code : this.errors.INTERNAL_ERROR;

            return this.makeError(request.id, e.message || e, e.code, e.data);
        }
    };

    return Server;
}));

define('tiny-jsonrpc-postmessage/server',[
  'tiny-jsonrpc/server',
  'tiny-jsonrpc/util'
],
function (
  Server,
  util
) {
  var global = this;

  function PostMessageServer(options) {
    Server.apply(this, arguments);
    this._client = options.client || global;
    this._client.addEventListener('message', this._onMessage.bind(this));
  }

  PostMessageServer.prototype = new Server();
  PostMessageServer.prototype.constructor = PostMessageServer;

  PostMessageServer.prototype._onMessage = function (e) {
    if (!e.data || !e.data.method) {
      // ignore obviously invalid messages: they're not for us
      return;
    }

    var result = this.respond(JSON.stringify(e.data));

    if (typeof result === 'string') {
      this._client.postMessage(JSON.parse(result));
    }
  };

  return PostMessageServer;
});

define('index',[
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
    return require('index');
}));
