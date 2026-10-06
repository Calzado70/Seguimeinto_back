"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.consultarHistorial = exports.consultarAuditoria = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _mysql = _interopRequireDefault(require("../config/mysql.db"));
var _browser = require("../messages/browser.js");
var _paginacion = require("../utils/paginacion.js");
var _dotenv = require("dotenv");
(0, _dotenv.config)();
var consultarHistorial = exports.consultarHistorial = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _yield$poolBetrost$qu, _yield$poolBetrost$qu2, respuesta, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 1;
          return _mysql["default"].query("CALL sp_consultar_historial_movimientos();");
        case 1:
          _yield$poolBetrost$qu = _context.sent;
          _yield$poolBetrost$qu2 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu, 1);
          respuesta = _yield$poolBetrost$qu2[0];
          (0, _browser.success)(req, res, 200, respuesta[0]);
          _context.next = 3;
          break;
        case 2:
          _context.prev = 2;
          _t = _context["catch"](0);
          (0, _browser.error)(req, res, 500, _t);
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 2]]);
  }));
  return function consultarHistorial(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Listado paginado de la auditoría de la Fase 4.3.
 *
 * Filtros: `tabla`, `accion`, `fecha_desde`, `fecha_hasta` y `usuario`
 * (búsqueda parcial sobre el nombre del actor). El usuario se guarda en
 * su propia columna además de como clave ajena, precisamente para poder
 * seguir mostrando el nombre cuando el usuario ya no existe.
 */
var consultarAuditoria = exports.consultarAuditoria = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _normalizarPaginacion, page, limit, offset, condiciones, parametros, where, total, _yield$poolBetrost$qu3, _yield$poolBetrost$qu4, filas, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _normalizarPaginacion = (0, _paginacion.normalizarPaginacion)(req.query), page = _normalizarPaginacion.page, limit = _normalizarPaginacion.limit, offset = _normalizarPaginacion.offset;
          condiciones = [];
          parametros = [];
          if (req.query.tabla) {
            condiciones.push("a.tabla = ?");
            parametros.push(req.query.tabla.trim());
          }
          if (req.query.accion) {
            condiciones.push("a.accion = ?");
            parametros.push(req.query.accion.trim());
          }
          if (req.query.usuario) {
            condiciones.push("a.usuario LIKE ?");
            parametros.push("%".concat(req.query.usuario.trim(), "%"));
          }
          if (req.query.fecha_desde) {
            condiciones.push("a.fecha >= ?");
            parametros.push(req.query.fecha_desde.trim());
          }
          if (req.query.fecha_hasta) {
            // Se añade un día para que `hasta` sea inclusivo de la fecha entera.
            condiciones.push("a.fecha < DATE_ADD(?, INTERVAL 1 DAY)");
            parametros.push(req.query.fecha_hasta.trim());
          }
          where = condiciones.length ? condiciones.join(" AND ") : "";
          _context2.prev = 1;
          _context2.next = 2;
          return (0, _paginacion.contarFilas)(_mysql["default"], "auditoria a", where, parametros);
        case 2:
          total = _context2.sent;
          _context2.next = 3;
          return _mysql["default"].query("SELECT\n  a.id_auditoria,\n  a.tabla,\n  a.accion,\n  a.id_registro,\n  a.id_usuario,\n  a.usuario,\n  a.ip,\n  a.user_agent,\n  a.datos_antes,\n  a.datos_despues,\n  a.fecha\nFROM auditoria a\n".concat(where ? "WHERE ".concat(where) : "", "\nORDER BY a.id_auditoria DESC\nLIMIT ? OFFSET ?"), [].concat(parametros, [limit, offset]));
        case 3:
          _yield$poolBetrost$qu3 = _context2.sent;
          _yield$poolBetrost$qu4 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu3, 1);
          filas = _yield$poolBetrost$qu4[0];
          (0, _paginacion.enviarTotalCount)(res, total);
          return _context2.abrupt("return", (0, _browser.success)(req, res, 200, filas));
        case 4:
          _context2.prev = 4;
          _t2 = _context2["catch"](1);
          console.error("Error consultando auditoría:", _t2);
          return _context2.abrupt("return", (0, _browser.error)(req, res, 500, "Error consultando auditoría"));
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[1, 4]]);
  }));
  return function consultarAuditoria(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();