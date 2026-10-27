"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controller = require("../controllers/controller.importacion");
var _oauth = require("../middleware/oauth");
var rutaImportacion = (0, _express.Router)();
rutaImportacion.get("/catalogos", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.catalogos);
rutaImportacion.post("/importar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.importar);
var _default = exports["default"] = rutaImportacion;