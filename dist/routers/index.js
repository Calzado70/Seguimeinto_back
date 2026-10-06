"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _browser = require("../messages/browser.js");
var _usuarioRoutes = _interopRequireDefault(require("./usuario.routes.js"));
var _bodegaRoutes = _interopRequireDefault(require("./bodega.routes.js"));
var _regproductoRoutes = _interopRequireDefault(require("./regproducto.routes.js"));
var _historialRoutes = _interopRequireDefault(require("./historial.routes.js"));
var _catalogoRoutes = _interopRequireDefault(require("./catalogo.routes.js"));
var _regcaracteristicaRoutes = _interopRequireDefault(require("./regcaracteristica.routes.js"));
var ruta = (0, _express.Router)();
ruta.use("/user", _usuarioRoutes["default"]);
ruta.use("/bode", _bodegaRoutes["default"]);
ruta.use("/product", _regproductoRoutes["default"]);
ruta.use("/hist", _historialRoutes["default"]);
ruta.use("/catalogo", _catalogoRoutes["default"]);
ruta.use("/caracter", _regcaracteristicaRoutes["default"]);
ruta.use("/", function (req, res) {
  res.json({
    "respuesta": _browser.messageBrowse.principal
  });
});
var _default = exports["default"] = ruta;