"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mostrar = exports.modificar = exports.eliminarPermisoBodega = exports.eliminar = exports.crear = exports.bodegasPorUsuario = exports.asignarBodegaUsuario = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _mysql = _interopRequireDefault(require("../config/mysql.db"));
var _browser = require("../messages/browser");
var _dotenv = require("dotenv");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(0, _dotenv.config)();
var mostrar = exports.mostrar = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var id, query, params, _yield$poolBetrost$qu, _yield$poolBetrost$qu2, respuesta, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          id = req.query.id;
          params = [];
          if (id) {
            query = "CALL sp_mostrar_bodega_por_id(?)";
            params = [id];
          } else {
            query = "CALL sp_mostrar_bodega()";
          }
          _context.next = 1;
          return _mysql["default"].query(query, params);
        case 1:
          _yield$poolBetrost$qu = _context.sent;
          _yield$poolBetrost$qu2 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu, 1);
          respuesta = _yield$poolBetrost$qu2[0];
          if (!(!respuesta || !respuesta[0])) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", res.status(404).json({
            success: false,
            message: id ? 'Bodega no encontrada' : 'No hay bodegas registradas'
          }));
        case 2:
          res.status(200).json({
            success: true,
            data: respuesta[0]
          });
          _context.next = 4;
          break;
        case 3:
          _context.prev = 3;
          _t = _context["catch"](0);
          console.error("Error en mostrar bodegas:", _t);
          res.status(500).json({
            success: false,
            message: "Error al obtener bodegas",
            error: _t.message,
            sqlMessage: _t.sqlMessage // Para depuración
          });
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 3]]);
  }));
  return function mostrar(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
var crear = exports.crear = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$body, nombre, capacidad, _req$body$estado, estado, _yield$poolBetrost$qu3, _yield$poolBetrost$qu4, respuesta, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _req$body = req.body, nombre = _req$body.nombre, capacidad = _req$body.capacidad, _req$body$estado = _req$body.estado, estado = _req$body$estado === void 0 ? 'ACTIVA' : _req$body$estado; // Cambiado a 'ACTIVA'
          // Validación mejorada
          if (!(!nombre || !capacidad)) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(400).json({
            success: false,
            message: "Nombre y capacidad son obligatorios"
          }));
        case 1:
          if (!(typeof capacidad !== 'number' || capacidad <= 0)) {
            _context2.next = 2;
            break;
          }
          return _context2.abrupt("return", res.status(400).json({
            success: false,
            message: "Capacidad debe ser un número positivo"
          }));
        case 2:
          _context2.prev = 2;
          _context2.next = 3;
          return _mysql["default"].query("CALL sp_crear_bodegas(?, ?, ?)", [nombre, capacidad, estado]);
        case 3:
          _yield$poolBetrost$qu3 = _context2.sent;
          _yield$poolBetrost$qu4 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu3, 1);
          respuesta = _yield$poolBetrost$qu4[0];
          if (!(respuesta.affectedRows === 1)) {
            _context2.next = 4;
            break;
          }
          return _context2.abrupt("return", res.status(201).json({
            success: true,
            message: "Bodega creada correctamente",
            data: {
              id_bodega: respuesta.insertId,
              nombre: nombre,
              capacidad: capacidad,
              estado: estado
            }
          }));
        case 4:
          return _context2.abrupt("return", res.status(400).json({
            success: false,
            message: "No se pudo crear la bodega"
          }));
        case 5:
          _context2.prev = 5;
          _t2 = _context2["catch"](2);
          console.error("Error al crear bodega:", _t2);
          if (!(_t2.code === 'ER_DUP_ENTRY')) {
            _context2.next = 6;
            break;
          }
          return _context2.abrupt("return", res.status(400).json({
            success: false,
            message: "Ya existe una bodega con ese nombre"
          }));
        case 6:
          return _context2.abrupt("return", res.status(500).json({
            success: false,
            message: "Error en el servidor",
            error: _t2.message
          }));
        case 7:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[2, 5]]);
  }));
  return function crear(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();
var modificar = exports.modificar = /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$body2, id_bodega, nombre, capacidad, estado, _yield$poolBetrost$qu5, _yield$poolBetrost$qu6, respuesta, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _req$body2 = req.body, id_bodega = _req$body2.id_bodega, nombre = _req$body2.nombre, capacidad = _req$body2.capacidad, estado = _req$body2.estado;
          if (!(!id_bodega || !nombre || !capacidad || !estado)) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            success: false,
            message: "Todos los campos son obligatorios"
          }));
        case 1:
          if (!(typeof capacidad !== 'number' || capacidad <= 0)) {
            _context3.next = 2;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            success: false,
            message: "Capacidad debe ser un número positivo"
          }));
        case 2:
          _context3.prev = 2;
          _context3.next = 3;
          return _mysql["default"].query("CALL sp_modificar_bodega(?, ?, ?, ?)", [id_bodega, nombre, capacidad, estado]);
        case 3:
          _yield$poolBetrost$qu5 = _context3.sent;
          _yield$poolBetrost$qu6 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu5, 1);
          respuesta = _yield$poolBetrost$qu6[0];
          if (!(respuesta.affectedRows === 1)) {
            _context3.next = 4;
            break;
          }
          return _context3.abrupt("return", res.status(200).json({
            success: true,
            message: "Bodega modificada correctamente",
            data: {
              id_bodega: id_bodega,
              nombre: nombre,
              capacidad: capacidad,
              estado: estado
            }
          }));
        case 4:
          return _context3.abrupt("return", res.status(400).json({
            success: false,
            message: "No se pudo modificar la bodega"
          }));
        case 5:
          _context3.prev = 5;
          _t3 = _context3["catch"](2);
          console.error("Error al modificar bodega:", _t3);
          if (!(_t3.code === 'ER_DUP_ENTRY')) {
            _context3.next = 6;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            success: false,
            message: "Ya existe una bodega con ese nombre"
          }));
        case 6:
          return _context3.abrupt("return", res.status(500).json({
            success: false,
            message: "Error en el servidor",
            error: _t3.message
          }));
        case 7:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[2, 5]]);
  }));
  return function modificar(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}();
var eliminar = exports.eliminar = /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var id_bodega, respuesta, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          id_bodega = req.body.id_bodega;
          if (id_bodega) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 400, "Todos los campos son obligatorios"));
        case 1:
          _context4.prev = 1;
          _context4.next = 2;
          return _mysql["default"].query("CALL sp_eliminar_bodega(?);", [id_bodega]);
        case 2:
          respuesta = _context4.sent;
          if (respuesta[0].affectedRows === 1) {
            (0, _browser.success)(req, res, 201, "Bodega eliminada correctamente");
          } else {
            (0, _browser.error)(req, res, 400, "No se pudo eliminar la bodega");
          }
          _context4.next = 4;
          break;
        case 3:
          _context4.prev = 3;
          _t4 = _context4["catch"](1);
          (0, _browser.error)(req, res, 500, _t4.message);
        case 4:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 3]]);
  }));
  return function eliminar(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}();
var bodegasPorUsuario = exports.bodegasPorUsuario = /*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var id_usuario, _yield$poolBetrost$qu7, _yield$poolBetrost$qu8, rows, _t5;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          id_usuario = req.params.id_usuario;
          _context5.prev = 1;
          _context5.next = 2;
          return _mysql["default"].query("\n      SELECT b.id_bodega, b.nombre\n      FROM bodegas b\n      INNER JOIN permisos_bodegas bu \n        ON bu.id_bodega = b.id_bodega\n      WHERE bu.id_usuario = ?\n      ", [id_usuario]);
        case 2:
          _yield$poolBetrost$qu7 = _context5.sent;
          _yield$poolBetrost$qu8 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu7, 1);
          rows = _yield$poolBetrost$qu8[0];
          res.json({
            success: true,
            data: rows
          });
          _context5.next = 4;
          break;
        case 3:
          _context5.prev = 3;
          _t5 = _context5["catch"](1);
          console.error("Error obteniendo bodegas del usuario:", _t5);
          res.status(500).json({
            success: false,
            message: "Error al obtener bodegas"
          });
        case 4:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[1, 3]]);
  }));
  return function bodegasPorUsuario(_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}();
var asignarBodegaUsuario = exports.asignarBodegaUsuario = /*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$body3, id_usuario, bodegas, _iterator, _step, id_bodega, _t6, _t7;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _req$body3 = req.body, id_usuario = _req$body3.id_usuario, bodegas = _req$body3.bodegas;
          _context6.prev = 1;
          _iterator = _createForOfIteratorHelper(bodegas);
          _context6.prev = 2;
          _iterator.s();
        case 3:
          if ((_step = _iterator.n()).done) {
            _context6.next = 5;
            break;
          }
          id_bodega = _step.value;
          _context6.next = 4;
          return _mysql["default"].query("CALL sp_asignar_bodega_usuario(?,?)", [id_usuario, id_bodega]);
        case 4:
          _context6.next = 3;
          break;
        case 5:
          _context6.next = 7;
          break;
        case 6:
          _context6.prev = 6;
          _t6 = _context6["catch"](2);
          _iterator.e(_t6);
        case 7:
          _context6.prev = 7;
          _iterator.f();
          return _context6.finish(7);
        case 8:
          res.json({
            success: true,
            message: "Bodegas asignadas correctamente"
          });
          _context6.next = 10;
          break;
        case 9:
          _context6.prev = 9;
          _t7 = _context6["catch"](1);
          console.error("Error asignando bodega:", _t7);
          res.status(500).json({
            success: false,
            message: "Error asignando bodegas"
          });
        case 10:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 9], [2, 6, 7, 8]]);
  }));
  return function asignarBodegaUsuario(_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}();
var eliminarPermisoBodega = exports.eliminarPermisoBodega = /*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$body4, id_usuario, id_bodega, _t8;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _req$body4 = req.body, id_usuario = _req$body4.id_usuario, id_bodega = _req$body4.id_bodega;
          _context7.prev = 1;
          _context7.next = 2;
          return _mysql["default"].query("CALL sp_eliminar_permiso_bodega(?,?)", [id_usuario, id_bodega]);
        case 2:
          res.json({
            success: true,
            message: "Permiso eliminado"
          });
          _context7.next = 4;
          break;
        case 3:
          _context7.prev = 3;
          _t8 = _context7["catch"](1);
          console.error("Error eliminando permiso:", _t8);
          res.status(500).json({
            success: false,
            message: "Error eliminando permiso"
          });
        case 4:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[1, 3]]);
  }));
  return function eliminarPermisoBodega(_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}();