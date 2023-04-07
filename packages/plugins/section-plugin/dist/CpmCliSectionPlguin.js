"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var root = path_1["default"].resolve(__dirname);
var targetHtmlPath = path_1["default"].resolve(root, './index.html');
var CpmCliSectionPlguin = function () {
    return {
        name: 'pm:section-plugin',
        resolveId: function (id) {
            return id;
        },
        config: function (config, env) {
            return __assign(__assign({}, config), { server: {
                    fs: {
                        strict: false
                    }
                }, resolve: {
                    alias: {
                        '@section': "".concat(process.cwd())
                    }
                } });
        },
        transformIndexHtml: function (html) {
            var replaceHtml = fs_1["default"].readFileSync(targetHtmlPath, 'utf-8');
            return {
                html: replaceHtml,
                tags: [
                    {
                        tag: 'script',
                        attrs: {
                            type: 'module',
                            src: "/@fs/".concat(path_1["default"].resolve(__dirname), "/main.js")
                        },
                        injectTo: 'body'
                    }
                ]
            };
        }
    };
};
exports["default"] = CpmCliSectionPlguin;
