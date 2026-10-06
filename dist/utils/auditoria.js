"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.contextoSolicitud = contextoSolicitud;
exports.recortarFila = recortarFila;
exports.registrarAuditoria = registrarAuditoria;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/* Escritura de la tabla `auditoria` (Fase 4.3).
 *
 * La auditoría se escribe desde la aplicación y no desde triggers, porque
 * un trigger de MySQL no tiene acceso a `req.user`: solo ve el estado de
 * la transacción. La identidad, la IP y el user-agent existen en la capa
 * HTTP, así que aquí es donde deben registrarse.
 *
 * Dos reglas que no son estética:
 *
 *  - `id_usuario` es anulable y además se guarda `usuario` (el nombre en
 *    el momento del hecho). Si se audita la baja de un usuario y la clave
 *    ajena fuera RESTRICT, ese usuario nunca podría eliminarse: la
 *    auditoría se volvería contradictoria. ON DELETE SET NULL + el nombre
 *    resuelven eso.
 *
 *  - Un fallo de auditoría nunca debe tumbar la operación auditada. Se
 *    intenta escribir, se loguea el error y se sigue. Perder una línea de
 *    auditoría es preferible a que falle una transferencia de inventario.
 */

/**
 * Extrae del request la información de quién y desde dónde se actuó.
 * `X-Forwarded-For` solo si hay `trust proxy` configurado; si no,
 * `req.ip` ya es la dirección real del socket.
 */
function contextoSolicitud(req) {
  var user = req.user || {};
  return {
    id_usuario: Number.isInteger(user.id_usuario) ? user.id_usuario : null,
    usuario: typeof user.nombre === "string" ? user.nombre : null,
    ip: req.ip || null,
    user_agent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 512) : null
  };
}

/**
 * Registra una acción. Nunca lanza: `pool` debe ser el mismo que ejecutó
 * la operación auditada para que quede en la misma transacción cuando la
 * haya.
 *
 * @param {import('mysql2/promise').Pool|Object} pool
 * @param {import('express').Request} req
 * @param {object} detalle  { tabla, accion, id_registro, datos_antes, datos_despues }
 */
function registrarAuditoria(_x, _x2, _x3) {
  return _registrarAuditoria.apply(this, arguments);
}
/**
 * Los datos van como JSON. `mysql2` no serializa objetos y los envía como
 * `[object Object]`, que MySQL rechazaría por `json_valid`, así que se
 * serializa aquí de forma explícita.
 */
function _registrarAuditoria() {
  _registrarAuditoria = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(pool, req, detalle) {
    var tabla, accion, _detalle$id_registro, id_registro, _detalle$datos_antes, datos_antes, _detalle$datos_despue, datos_despues, contexto, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          tabla = detalle.tabla, accion = detalle.accion, _detalle$id_registro = detalle.id_registro, id_registro = _detalle$id_registro === void 0 ? null : _detalle$id_registro, _detalle$datos_antes = detalle.datos_antes, datos_antes = _detalle$datos_antes === void 0 ? null : _detalle$datos_antes, _detalle$datos_despue = detalle.datos_despues, datos_despues = _detalle$datos_despue === void 0 ? null : _detalle$datos_despue;
          if (!(!tabla || !accion)) {
            _context.next = 1;
            break;
          }
          console.error("Auditoría omitida: falta tabla o acción", detalle);
          return _context.abrupt("return");
        case 1:
          contexto = contextoSolicitud(req);
          _context.next = 2;
          return pool.query("INSERT INTO auditoria\n         (tabla, accion, id_registro, id_usuario, usuario, ip, user_agent,\n          datos_antes, datos_despues)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [tabla, accion, id_registro, contexto.id_usuario, contexto.usuario, contexto.ip, contexto.user_agent, serializar(datos_antes), serializar(datos_despues)]);
        case 2:
          _context.next = 4;
          break;
        case 3:
          _context.prev = 3;
          _t = _context["catch"](0);
          // No propagar: la operación principal ya se ejecutó.
          console.error("No se pudo registrar la auditoría:", _t.message);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 3]]);
  }));
  return _registrarAuditoria.apply(this, arguments);
}
function serializar(valor) {
  if (valor === null || valor === undefined) return null;
  try {
    return JSON.stringify(valor);
  } catch (err) {
    return null;
  }
}

/**
 * Reduce una fila a sus columnas, para guardar el antes/después sin
 * arrastrar columnas derivadas o demasiado largas.
 */
function recortarFila(fila, columnas) {
  if (!fila) return null;
  if (!Array.isArray(columnas)) return fila;
  var salida = {};
  var _iterator = _createForOfIteratorHelper(columnas),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var columna = _step.value;
      if (columna in fila) salida[columna] = fila[columna];
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return salida;
}