"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controllerHistorial = require("../controllers/controller.historial.js");
var _oauth = require("../middleware/oauth.js");
var rutaHistorial = (0, _express.Router)();
rutaHistorial.get("/historial", _oauth.verifyToken, _controllerHistorial.consultarHistorial);
// Auditoría de la Fase 4.3: solo administradores, igual que la gestión
// de usuarios y catálogo que se audita.
rutaHistorial.get("/auditoria", _oauth.verifyToken, _oauth.verifyAdministrador, _controllerHistorial.consultarAuditoria);
// rutaHistorial.get("/logistica"); // Assuming you want to show sent products as well
var _default = exports["default"] = rutaHistorial;