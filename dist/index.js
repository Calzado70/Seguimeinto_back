"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _app = _interopRequireDefault(require("./app.js"));
var _consola = require("./messages/consola.js");
_app["default"].listen(_app["default"].get("port"), function () {
  (0, _consola.msjConsole)("puertoSuccess", "".concat(_consola.mensa.puerto, " ").concat(_app["default"].get("port"), " http://localhost:").concat(_app["default"].get("port")));
});