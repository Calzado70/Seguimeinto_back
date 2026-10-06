"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controller = require("../controllers/controller.bodega");
var _oauth = require("../middleware/oauth");
var rutaBodega = (0, _express.Router)();

// rutas de la base de datos betrost
rutaBodega.get("/mostrar", _oauth.verifyToken, _controller.mostrar);
rutaBodega.get("/bodegas-usuario/:id_usuario", _oauth.verifyToken, _controller.bodegasPorUsuario);
rutaBodega.post("/crear", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.crear);
rutaBodega.put("/modificar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.modificar);
rutaBodega["delete"]("/eliminar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.eliminar);
rutaBodega.post("/asignar", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.asignarBodegaUsuario);
rutaBodega["delete"]("/eliminar-permiso", _oauth.verifyToken, _oauth.verifyAdministrador, _controller.eliminarPermisoBodega);
var _default = exports["default"] = rutaBodega;