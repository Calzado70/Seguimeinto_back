"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controller = require("../controllers/controller.producto");
var _oauth = require("../middleware/oauth");
var rutaCatalogo = (0, _express.Router)();
rutaCatalogo.get("/listar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.listar_catalogo);
rutaCatalogo.post("/crear", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.crear_catalogo);
rutaCatalogo.put("/actualizar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.actualizar_catalogo);
rutaCatalogo.put("/inhabilitar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.inhabilitar_catalogo);
rutaCatalogo.put("/activar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.activar_catalogo);
var _default = exports["default"] = rutaCatalogo;