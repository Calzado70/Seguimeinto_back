"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.limiterLogin = exports.limiterGeneral = void 0;
var _expressRateLimit = require("express-rate-limit");
// Clave numérica desde .env para poder ajustar sin tocar código.
function limiteDesdeEnv(clave, porDefecto) {
  var valor = Number(process.env[clave]);
  return Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
}

// El límite general protege contra abuso, pero NO debe poder dejar a un
// usuario legítimo sin sesión. Antes eran 300 peticiones cada 15 minutos
// para TODAS las rutas: un turno de pruebas (escaneos + validaciones)
// agotaba la cuota y a partir de ahí:
//   - /product/stock devolvía 429 y el frontend traducía ese error como
//     "Stock insuficiente" aunque sí hubiera stock;
//   - /user/verificar (usado por el guard del frontend) también daba 429,
//     el guard lo interpretaba como token inválido, borraba la cookie y
//     redirigía a /login; al volver a entrar volvía a fallar, con lo que
//     el usuario quedaba atrapado en el login hasta que expiraba la ventana.
// Por eso se excluyen las rutas de sesión/salud y se sube bastante la cuota.
var limiterGeneral = exports.limiterGeneral = (0, _expressRateLimit.rateLimit)({
  windowMs: 15 * 60 * 1000,
  limit: limiteDesdeEnv("RATE_LIMIT_GENERAL", 5000),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    status: 429,
    message: "Demasiadas peticiones. Intente de nuevo en unos minutos."
  },
  skip: function skip(req) {
    return ["/user/loginusuario", "/user/verificar", "/health"].includes(req.path);
  }
});

// Intentos de login por IP. Se mantiene la protección contra fuerza bruta,
// pero con una cuota más holgada para no bloquear un equipo de trabajo
// compartido durante 15 minutos por unos intentos repetidos.
var limiterLogin = exports.limiterLogin = (0, _expressRateLimit.rateLimit)({
  windowMs: 15 * 60 * 1000,
  limit: limiteDesdeEnv("RATE_LIMIT_LOGIN", 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    status: 429,
    message: "Demasiados intentos de inicio de sesión. Espere unos minutos."
  }
});