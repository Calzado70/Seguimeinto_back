"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controller = require("../controllers/controller.usuario");
var _oauth = require("../middleware/oauth");
var _rateLimit = require("../middleware/rateLimit");
var rutausaurio = (0, _express.Router)();

// rutas de la base de datos betrost
rutausaurio.post("/loginusuario", _rateLimit.limiterLogin, _controller.login);
rutausaurio.get("/verificar", _oauth.verifyToken, function (req, res) {
  res.status(200).json({
    success: true,
    usuario: req.user
  });
});
rutausaurio.post("/insertarusuario", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.insertarusuario);
rutausaurio.put("/modificar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.modificar);
rutausaurio["delete"]("/eliminar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.eliminar);
rutausaurio.get("/mostrar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.mostar);
rutausaurio.get("/usuarios/:id", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.obtenerUsuarioPorId);
var _default = exports["default"] = rutausaurio;