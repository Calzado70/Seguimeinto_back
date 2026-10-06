"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controller = require("../controllers/controller.caracteristica");
var _oauth = require("../middleware/oauth");
var rutaCaracteristica = (0, _express.Router)();
rutaCaracteristica.get("/listar", _oauth.verifyToken, _controller.listar);
rutaCaracteristica.post("/crear", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.crear);
rutaCaracteristica.put("/modificar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.modificar);
rutaCaracteristica["delete"]("/eliminar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.eliminar);
var _default = exports["default"] = rutaCaracteristica;