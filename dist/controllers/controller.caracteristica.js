"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.modificar = exports.listar = exports.eliminar = exports.crear = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _mysql = _interopRequireDefault(require("../config/mysql.db"));
var _browser = require("../messages/browser");
var _auditoria = require("../utils/auditoria");
var _dotenv = require("dotenv");
(0, _dotenv.config)();
var listar = exports.listar = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var soloActivas, _yield$poolBetrost$qu, _yield$poolBetrost$qu2, respuesta, data, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          soloActivas = req.query.soloActivas;
          _context.next = 1;
          return _mysql["default"].query("SELECT id, valor, estado FROM caracteristicas ORDER BY valor");
        case 1:
          _yield$poolBetrost$qu = _context.sent;
          _yield$poolBetrost$qu2 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu, 1);
          respuesta = _yield$poolBetrost$qu2[0];
          data = respuesta;
          if (!(soloActivas === "true" || soloActivas === "1")) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", (0, _browser.success)(req, res, 200, data.filter(function (c) {
            return c.estado === "ACTIVA";
          })));
        case 2:
          (0, _browser.success)(req, res, 200, data);
          _context.next = 4;
          break;
        case 3:
          _context.prev = 3;
          _t = _context["catch"](0);
          (0, _browser.error)(req, res, 500, _t);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 3]]);
  }));
  return function listar(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
var crear = exports.crear = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var valor, valorNormalizado, _yield$poolBetrost$qu3, _yield$poolBetrost$qu4, respuesta, _respuesta$insertId, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          valor = req.body.valor;
          if (!(!valor || valor.trim() === "")) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", (0, _browser.error)(req, res, 400, "El valor de la característica es obligatorio"));
        case 1:
          valorNormalizado = valor.trim().toUpperCase();
          _context2.prev = 2;
          _context2.next = 3;
          return _mysql["default"].query("INSERT INTO caracteristicas (valor, estado) VALUES (?, 'ACTIVA')", [valorNormalizado]);
        case 3:
          _yield$poolBetrost$qu3 = _context2.sent;
          _yield$poolBetrost$qu4 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu3, 1);
          respuesta = _yield$poolBetrost$qu4[0];
          if (!(respuesta.affectedRows === 1)) {
            _context2.next = 5;
            break;
          }
          _context2.next = 4;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "caracteristicas",
            accion: "CREAR",
            id_registro: (_respuesta$insertId = respuesta.insertId) !== null && _respuesta$insertId !== void 0 ? _respuesta$insertId : null,
            datos_despues: {
              valor: valorNormalizado,
              estado: "ACTIVA"
            }
          });
        case 4:
          return _context2.abrupt("return", (0, _browser.success)(req, res, 201, {
            id: respuesta.insertId,
            valor: valorNormalizado
          }, "Característica creada correctamente"));
        case 5:
          (0, _browser.error)(req, res, 400, "No se pudo crear la característica");
          _context2.next = 8;
          break;
        case 6:
          _context2.prev = 6;
          _t2 = _context2["catch"](2);
          if (!(_t2.code === "ER_DUP_ENTRY")) {
            _context2.next = 7;
            break;
          }
          return _context2.abrupt("return", (0, _browser.error)(req, res, 400, "Ya existe una característica con ese valor"));
        case 7:
          (0, _browser.error)(req, res, 500, _t2);
        case 8:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[2, 6]]);
  }));
  return function crear(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();
var modificar = exports.modificar = /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$body, id, valor, estado, valorNormalizado, _yield$poolBetrost$qu5, _yield$poolBetrost$qu6, previo, _yield$poolBetrost$qu7, _yield$poolBetrost$qu8, respuesta, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _req$body = req.body, id = _req$body.id, valor = _req$body.valor, estado = _req$body.estado;
          if (!(!id || !valor || !estado)) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", (0, _browser.error)(req, res, 400, "Todos los campos son obligatorios"));
        case 1:
          valorNormalizado = valor.trim().toUpperCase();
          _context3.prev = 2;
          _context3.next = 3;
          return _mysql["default"].query("SELECT valor, estado FROM caracteristicas WHERE id = ?", [id]);
        case 3:
          _yield$poolBetrost$qu5 = _context3.sent;
          _yield$poolBetrost$qu6 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu5, 1);
          previo = _yield$poolBetrost$qu6[0];
          _context3.next = 4;
          return _mysql["default"].query("UPDATE caracteristicas SET valor = ?, estado = ? WHERE id = ?", [valorNormalizado, estado, id]);
        case 4:
          _yield$poolBetrost$qu7 = _context3.sent;
          _yield$poolBetrost$qu8 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu7, 1);
          respuesta = _yield$poolBetrost$qu8[0];
          if (!(respuesta.affectedRows === 1)) {
            _context3.next = 6;
            break;
          }
          _context3.next = 5;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "caracteristicas",
            accion: "MODIFICAR",
            id_registro: id,
            datos_antes: (0, _auditoria.recortarFila)(previo[0], ["valor", "estado"]),
            datos_despues: {
              valor: valorNormalizado,
              estado: estado
            }
          });
        case 5:
          return _context3.abrupt("return", (0, _browser.success)(req, res, 200, null, "Característica modificada correctamente"));
        case 6:
          (0, _browser.error)(req, res, 400, "No se pudo modificar la característica");
          _context3.next = 9;
          break;
        case 7:
          _context3.prev = 7;
          _t3 = _context3["catch"](2);
          if (!(_t3.code === "ER_DUP_ENTRY")) {
            _context3.next = 8;
            break;
          }
          return _context3.abrupt("return", (0, _browser.error)(req, res, 400, "Ya existe una característica con ese valor"));
        case 8:
          (0, _browser.error)(req, res, 500, _t3);
        case 9:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[2, 7]]);
  }));
  return function modificar(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}();
var eliminar = exports.eliminar = /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var id, _yield$poolBetrost$qu9, _yield$poolBetrost$qu0, previo, _yield$poolBetrost$qu1, _yield$poolBetrost$qu10, respuesta, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          id = req.body.id;
          if (id) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 400, "El id es obligatorio"));
        case 1:
          _context4.prev = 1;
          _context4.next = 2;
          return _mysql["default"].query("SELECT valor, estado FROM caracteristicas WHERE id = ?", [id]);
        case 2:
          _yield$poolBetrost$qu9 = _context4.sent;
          _yield$poolBetrost$qu0 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu9, 1);
          previo = _yield$poolBetrost$qu0[0];
          _context4.next = 3;
          return _mysql["default"].query("DELETE FROM caracteristicas WHERE id = ?", [id]);
        case 3:
          _yield$poolBetrost$qu1 = _context4.sent;
          _yield$poolBetrost$qu10 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu1, 1);
          respuesta = _yield$poolBetrost$qu10[0];
          if (!(respuesta.affectedRows === 1)) {
            _context4.next = 5;
            break;
          }
          _context4.next = 4;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "caracteristicas",
            accion: "ELIMINAR",
            id_registro: id,
            datos_antes: (0, _auditoria.recortarFila)(previo[0], ["valor", "estado"])
          });
        case 4:
          return _context4.abrupt("return", (0, _browser.success)(req, res, 200, null, "Característica eliminada correctamente"));
        case 5:
          (0, _browser.error)(req, res, 400, "No se pudo eliminar la característica");
          _context4.next = 7;
          break;
        case 6:
          _context4.prev = 6;
          _t4 = _context4["catch"](1);
          (0, _browser.error)(req, res, 500, _t4);
        case 7:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 6]]);
  }));
  return function eliminar(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}();