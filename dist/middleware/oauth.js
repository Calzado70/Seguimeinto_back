"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.verifyToken = exports.verifyAdministrador = void 0;
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _dotenv = require("dotenv");
var _browser = require("../messages/browser");
(0, _dotenv.config)();
var verifyToken = exports.verifyToken = function verifyToken(req, res, next) {
  try {
    var authHeader = req.headers['authorization'];
    if (!authHeader) {
      return (0, _browser.error)(req, res, 401, "Token no proporcionado");
    }
    var token = authHeader.split(' ')[1];
    if (!token) {
      return (0, _browser.error)(req, res, 401, "Token inválido");
    }
    var decoded = _jsonwebtoken["default"].verify(token, process.env.TOKEN_PRIVATEKEY);
    req.user = decoded;
    next();
  } catch (e) {
    return (0, _browser.error)(req, res, 401, "Token inválido o expirado");
  }
};
var verifyAdministrador = exports.verifyAdministrador = function verifyAdministrador(req, res, next) {
  if (req.user && req.user.rol === "ADMINISTRADOR") {
    return next();
  }
  return (0, _browser.error)(req, res, 403, "No tienes permisos para realizar esta acción");
};