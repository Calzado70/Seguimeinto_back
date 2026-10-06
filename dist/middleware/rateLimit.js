"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.limiterLogin = exports.limiterGeneral = void 0;
var _expressRateLimit = require("express-rate-limit");
var limiterGeneral = exports.limiterGeneral = (0, _expressRateLimit.rateLimit)({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    status: 429,
    message: "Demasiadas peticiones. Intente de nuevo en unos minutos."
  },
  skip: function skip(req) {
    return req.path === "/user/loginusuario";
  }
});
var limiterLogin = exports.limiterLogin = (0, _expressRateLimit.rateLimit)({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    status: 429,
    message: "Demasiados intentos de inicio de sesión. Espere 15 minutos."
  }
});