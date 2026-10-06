"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.obtenerUsuarioPorId = exports.mostar = exports.modificar = exports.login = exports.insertarusuario = exports.eliminar = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _mysql = _interopRequireDefault(require("../config/mysql.db"));
var _bcrypt = _interopRequireWildcard(require("bcrypt"));
var _browser = require("../messages/browser");
var _dotenv = require("dotenv");
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function _interopRequireWildcard(e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, "default": e }; if (null === e || "object" != _typeof(e) && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t7 in e) "default" !== _t7 && {}.hasOwnProperty.call(e, _t7) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t7)) && (i.get || i.set) ? o(f, _t7, i) : f[_t7] = e[_t7]); return f; })(e, t); }
(0, _dotenv.config)();

//-----------------------------------   BASE DE DATOS DE BETROST    --------------------------------------------
//  ESTA BASE DE DATOS ES LA NUEVA ESTRUCTURA PARA MANEJAR QUE LAS BODEGAS PUEDAN CONCUMIR DE UNA A OTRA

var mostar = exports.mostar = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _yield$poolBetrost$qu, _yield$poolBetrost$qu2, respuesta, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 1;
          return _mysql["default"].query("CALL sp_consulta_usuarios();");
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
  return function mostar(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
var obtenerUsuarioPorId = exports.obtenerUsuarioPorId = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var id_usuario, rows, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          id_usuario = req.params.id;
          _context2.prev = 1;
          _context2.next = 2;
          return _mysql["default"].query("CALL sp_mostrar_usuario_id(?);", [id_usuario]);
        case 2:
          rows = _context2.sent;
          (0, _browser.success)(req, res, 200, rows[0][0]);
          _context2.next = 4;
          break;
        case 3:
          _context2.prev = 3;
          _t2 = _context2["catch"](1);
          console.error("Error al buscar usuario:", _t2);
          _t2(req, res, 500, "Error al buscar usuario");
        case 4:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[1, 3]]);
  }));
  return function obtenerUsuarioPorId(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();
var eliminar = exports.eliminar = /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var id_usuario, respuesta, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          id_usuario = req.body.id_usuario;
          _context3.prev = 1;
          _context3.next = 2;
          return _mysql["default"].query("CALL sp_eliminar_usuario(?);", [id_usuario]);
        case 2:
          respuesta = _context3.sent;
          if (respuesta[0].affectedRows == 1) {
            (0, _browser.success)(req, res, 200, "Usuario eliminado correctamente");
          } else {
            (0, _browser.error)(req, res, 400, "No se pudo eliminar el usuario");
          }
          _context3.next = 4;
          break;
        case 3:
          _context3.prev = 3;
          _t3 = _context3["catch"](1);
          (0, _browser.error)(req, res, 400, _t3);
        case 4:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 3]]);
  }));
  return function eliminar(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}();
var modificar = exports.modificar = /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$body, id_usuario, id_bodega, nombre, contrasena, _hash, _yield$poolBetrost$qu3, _yield$poolBetrost$qu4, respuesta, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _req$body = req.body, id_usuario = _req$body.id_usuario, id_bodega = _req$body.id_bodega, nombre = _req$body.nombre, contrasena = _req$body.contrasena;
          if (!(!id_usuario || !id_bodega || !nombre)) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 400, "Datos incompletos"));
        case 1:
          _context4.prev = 1;
          _hash = null; // Solo encripta si viene contraseña
          if (!(contrasena && contrasena.trim() !== "")) {
            _context4.next = 3;
            break;
          }
          _context4.next = 2;
          return _bcrypt["default"].hash(contrasena, 10);
        case 2:
          _hash = _context4.sent;
        case 3:
          _context4.next = 4;
          return _mysql["default"].query("CALL sp_modificar_usuario(?, ?, ?, ?)", [id_usuario, id_bodega, nombre, _hash]);
        case 4:
          _yield$poolBetrost$qu3 = _context4.sent;
          _yield$poolBetrost$qu4 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu3, 1);
          respuesta = _yield$poolBetrost$qu4[0];
          return _context4.abrupt("return", (0, _browser.success)(req, res, 200, "Usuario modificado correctamente"));
        case 5:
          _context4.prev = 5;
          _t4 = _context4["catch"](1);
          console.error("Error al modificar:", _t4);
          return _context4.abrupt("return", (0, _browser.error)(req, res, 500, _t4.message));
        case 6:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 5]]);
  }));
  return function modificar(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}();
var login = exports.login = /*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$body2, nombre, contrasena, _yield$poolBetrost$qu5, _yield$poolBetrost$qu6, rows, usuario, match, token, _t5;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _req$body2 = req.body, nombre = _req$body2.nombre, contrasena = _req$body2.contrasena;
          _context5.prev = 1;
          _context5.next = 2;
          return _mysql["default"].query("CALL sp_login(?);", [nombre]);
        case 2:
          _yield$poolBetrost$qu5 = _context5.sent;
          _yield$poolBetrost$qu6 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu5, 1);
          rows = _yield$poolBetrost$qu6[0];
          if (!(rows[0].length === 0)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", (0, _browser.error)(req, res, 404, "El usuario no existe."));
        case 3:
          usuario = rows[0][0]; // Acceder al primer resultado del procedimiento almacenado
          // Comparar la contraseña proporcionada con la contraseña cifrada
          _context5.next = 4;
          return _bcrypt["default"].compare(contrasena, usuario.contrasena);
        case 4:
          match = _context5.sent;
          if (match) {
            _context5.next = 5;
            break;
          }
          return _context5.abrupt("return", (0, _browser.error)(req, res, 401, "Contraseña incorrecta."));
        case 5:
          // Generar un token JWT con la información del usuario y la bodega
          token = _jsonwebtoken["default"].sign({
            id_usuario: usuario.id_usuario,
            id_bodega: usuario.id_bodega,
            nombre_bodega: usuario.nombre_bodega,
            nombre: usuario.nombre,
            rol: usuario.rol
          }, process.env.TOKEN_PRIVATEKEY,
          // Clave secreta
          {
            expiresIn: process.env.TOKEN_EXPIRES_IN
          } // Expiración del token
          ); // Devolver una respuesta exitosa con el token y la información del usuario
          res.status(200).json({
            message: "Bienvenido",
            token: token,
            usuario: {
              id_usuario: usuario.id_usuario,
              id_bodega: usuario.id_bodega,
              nombre_bodega: usuario.nombre_bodega,
              nombre: usuario.nombre,
              rol: usuario.rol
            }
          });
          _context5.next = 7;
          break;
        case 6:
          _context5.prev = 6;
          _t5 = _context5["catch"](1);
          console.error("Error en loginusuario:", _t5);
          (0, _browser.error)(req, res, 500, "Error en el servidor, por favor intente de nuevo.");
        case 7:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[1, 6]]);
  }));
  return function login(_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}();
var insertarusuario = exports.insertarusuario = /*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$body3, id_bodega, nombre, correo, contrasena, rol, estado, _hash2, _yield$poolBetrost$qu7, _yield$poolBetrost$qu8, result, _t6;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _req$body3 = req.body, id_bodega = _req$body3.id_bodega, nombre = _req$body3.nombre, correo = _req$body3.correo, contrasena = _req$body3.contrasena, rol = _req$body3.rol, estado = _req$body3.estado;
          _context6.prev = 1;
          _context6.next = 2;
          return _bcrypt["default"].hash(contrasena, 10);
        case 2:
          _hash2 = _context6.sent;
          _context6.next = 3;
          return _mysql["default"].query("CALL sp_insertar_usuario(?, ?, ?, ?, ?, ?)", [id_bodega, nombre, correo, _hash2, rol, estado]);
        case 3:
          _yield$poolBetrost$qu7 = _context6.sent;
          _yield$poolBetrost$qu8 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu7, 1);
          result = _yield$poolBetrost$qu8[0];
          if (!(result && result[0] && result[0][0] && result[0][0].affected_rows > 0)) {
            _context6.next = 4;
            break;
          }
          return _context6.abrupt("return", res.status(201).json({
            success: true,
            message: "Usuario creado correctamente",
            body: result[0][0] // Envía información adicional si es necesario
          }));
        case 4:
          return _context6.abrupt("return", res.status(400).json({
            success: false,
            message: "No se pudo crear el usuario",
            details: result // Para depuración
          }));
        case 5:
          _context6.prev = 5;
          _t6 = _context6["catch"](1);
          console.error("Error en insertarusuario:", _t6);
          return _context6.abrupt("return", res.status(500).json({
            success: false,
            message: "Error en el servidor",
            error: _t6.message
          }));
        case 6:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 5]]);
  }));
  return function insertarusuario(_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}();