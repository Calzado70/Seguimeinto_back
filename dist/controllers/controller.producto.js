"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transferirProducto = exports.obtener_detalle_sesion = exports.listar_catalogo = exports.iniciar_sesion_escaneo = exports.inhabilitar_catalogo = exports.finalizarSesionEscaneo = exports.finalizarProductoTerminada = exports.ejecutarConsumoTerminadaProceso = exports.ejecutarConsumoLogistica = exports.crear_producto = exports.crear_catalogo = exports.consultar_stock = exports.consultar_movimientos = exports.consultar_inventario = exports.consultarConsumoTerminadaProceso = exports.consultarConsumoLogistica = exports.consultarCodigo = exports.cancelar_sesion_escaneo = exports.ajustarInventario = exports.agregar_producto_sesion = exports.actualizar_catalogo = exports.actualizarCaracteristica = exports.activar_catalogo = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _mysql = _interopRequireDefault(require("../config/mysql.db"));
var _browser = require("../messages/browser");
var _paginacion = require("../utils/paginacion");
var _identidad = require("../utils/identidad");
var _auditoria = require("../utils/auditoria");
var _dotenv = require("dotenv");
(0, _dotenv.config)();
var consultar_inventario = exports.consultar_inventario = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var nombre_bodega, query, params, _yield$poolBetrost$qu, _yield$poolBetrost$qu2, rows, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          nombre_bodega = req.query.nombre_bodega;
          _context.prev = 1;
          query = "\n      SELECT *\n      FROM vista_inventario_con_observacion\n    ";
          params = []; // 🔍 filtro opcional por bodega
          if (nombre_bodega) {
            query += " WHERE bodega = ?";
            params.push(nombre_bodega.trim());
          }
          _context.next = 2;
          return _mysql["default"].query(query, params);
        case 2:
          _yield$poolBetrost$qu = _context.sent;
          _yield$poolBetrost$qu2 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu, 1);
          rows = _yield$poolBetrost$qu2[0];
          if (!(rows.length > 0)) {
            _context.next = 3;
            break;
          }
          return _context.abrupt("return", (0, _browser.success)(req, res, 200, rows));
        case 3:
          return _context.abrupt("return", (0, _browser.error)(req, res, 404, "No se encontraron productos en el inventario"));
        case 4:
          _context.next = 6;
          break;
        case 5:
          _context.prev = 5;
          _t = _context["catch"](1);
          console.error("Error al consultar inventario:", _t);
          return _context.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor"));
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 5]]);
  }));
  return function consultar_inventario(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
var consultar_stock = exports.consultar_stock = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var codigo_producto, _yield$poolBetrost$qu3, _yield$poolBetrost$qu4, respuesta, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          codigo_producto = req.query.codigo_producto; // Validar que codigo_producto esté presente y sea válido
          if (!(!codigo_producto || typeof codigo_producto !== "string" || codigo_producto.trim() === "")) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", (0, _browser.error)(req, res, 400, "El código del producto debe ser una cadena no vacía"));
        case 1:
          _context2.prev = 1;
          _context2.next = 2;
          return _mysql["default"].query("CALL sp_consultar_stock_producto(?);", [codigo_producto.trim()]);
        case 2:
          _yield$poolBetrost$qu3 = _context2.sent;
          _yield$poolBetrost$qu4 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu3, 1);
          respuesta = _yield$poolBetrost$qu4[0];
          if (respuesta[0] && respuesta[0].length > 0) {
            (0, _browser.success)(req, res, 200, respuesta[0]);
          } else {
            (0, _browser.error)(req, res, 404, "No se encontró stock disponible para el producto especificado");
          }
          _context2.next = 4;
          break;
        case 3:
          _context2.prev = 3;
          _t2 = _context2["catch"](1);
          console.error("Error al consultar el stock del producto:", _t2);
          (0, _browser.error)(req, res, 500, "Error interno del servidor al consultar el stock del producto");
        case 4:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[1, 3]]);
  }));
  return function consultar_stock(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();
var consultar_movimientos = exports.consultar_movimientos = /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$query, id_bodega, fecha_inicio, fecha_fin, codigo_inteligente, _yield$poolBetrost$qu5, _yield$poolBetrost$qu6, respuesta, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _req$query = req.query, id_bodega = _req$query.id_bodega, fecha_inicio = _req$query.fecha_inicio, fecha_fin = _req$query.fecha_fin, codigo_inteligente = _req$query.codigo_inteligente;
          _context3.prev = 1;
          _context3.next = 2;
          return _mysql["default"].query("CALL sp_consultar_movimientos(?, ?, ?, ?);", [id_bodega ? parseInt(id_bodega) : null, fecha_inicio || null, fecha_fin || null, codigo_inteligente || null]);
        case 2:
          _yield$poolBetrost$qu5 = _context3.sent;
          _yield$poolBetrost$qu6 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu5, 1);
          respuesta = _yield$poolBetrost$qu6[0];
          if (!(respuesta[0] && respuesta[0].length > 0)) {
            _context3.next = 3;
            break;
          }
          return _context3.abrupt("return", (0, _browser.success)(req, res, 200, respuesta[0]));
        case 3:
          return _context3.abrupt("return", (0, _browser.error)(req, res, 404, "No se encontraron movimientos"));
        case 4:
          _context3.next = 6;
          break;
        case 5:
          _context3.prev = 5;
          _t3 = _context3["catch"](1);
          console.error("Error al consultar los movimientos:", _t3);
          return _context3.abrupt("return", res.status(500).json({
            ok: false,
            message: "Error interno del servidor al consultar los movimientos"
          }));
        case 6:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 5]]);
  }));
  return function consultar_movimientos(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}();
var isValidDate = function isValidDate(dateString) {
  var regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  var date = new Date(dateString);
  var timestamp = date.getTime();
  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) return false;
  return dateString === date.toISOString().split("T")[0];
};
var iniciar_sesion_escaneo = exports.iniciar_sesion_escaneo = /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$body, id_bodega, nombre_usuario, observaciones, _yield$poolBetrost$qu7, _yield$poolBetrost$qu8, usuarios, id_usuario, _yield$poolBetrost$qu9, _yield$poolBetrost$qu0, output, _output$, id_sesion, mensaje, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _req$body = req.body, id_bodega = _req$body.id_bodega, nombre_usuario = _req$body.nombre_usuario, observaciones = _req$body.observaciones;
          if (!(!id_bodega || isNaN(id_bodega) || id_bodega <= 0)) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 400, "El ID de la bodega debe ser un número entero positivo"));
        case 1:
          if (!(parseInt(id_bodega) !== 1)) {
            _context4.next = 2;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 403, "Solo se permite iniciar sesión de escaneo en la bodega principal"));
        case 2:
          if (!(!nombre_usuario || typeof nombre_usuario !== "string")) {
            _context4.next = 3;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 400, "El nombre del usuario es requerido y debe ser texto"));
        case 3:
          _context4.prev = 3;
          _context4.next = 4;
          return _mysql["default"].query("SELECT id_usuario FROM usuarios WHERE nombre = ? LIMIT 1", [nombre_usuario.trim()]);
        case 4:
          _yield$poolBetrost$qu7 = _context4.sent;
          _yield$poolBetrost$qu8 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu7, 1);
          usuarios = _yield$poolBetrost$qu8[0];
          if (!(usuarios.length === 0)) {
            _context4.next = 5;
            break;
          }
          return _context4.abrupt("return", (0, _browser.error)(req, res, 404, "Usuario no encontrado con ese nombre"));
        case 5:
          id_usuario = usuarios[0].id_usuario; // 2. Llamar al procedimiento almacenado con el ID encontrado
          _context4.next = 6;
          return _mysql["default"].query("CALL sp_iniciar_sesion_escaneo(?, ?, ?, @p_id_sesion, @p_mensaje);", [parseInt(id_bodega), id_usuario, observaciones || null]);
        case 6:
          _context4.next = 7;
          return _mysql["default"].query("SELECT @p_id_sesion AS id_sesion, @p_mensaje AS mensaje");
        case 7:
          _yield$poolBetrost$qu9 = _context4.sent;
          _yield$poolBetrost$qu0 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu9, 1);
          output = _yield$poolBetrost$qu0[0];
          _output$ = output[0], id_sesion = _output$.id_sesion, mensaje = _output$.mensaje;
          if (!(id_sesion > 0)) {
            _context4.next = 8;
            break;
          }
          return _context4.abrupt("return", (0, _browser.success)(req, res, 200, {
            id_sesion: id_sesion,
            mensaje: mensaje
          }));
        case 8:
          return _context4.abrupt("return", (0, _browser.error)(req, res, 400, mensaje));
        case 9:
          _context4.next = 11;
          break;
        case 10:
          _context4.prev = 10;
          _t4 = _context4["catch"](3);
          console.error("Error al iniciar sesión de escaneo:", _t4);
          return _context4.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al iniciar sesión de escaneo"));
        case 11:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[3, 10]]);
  }));
  return function iniciar_sesion_escaneo(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}();
var agregar_producto_sesion = exports.agregar_producto_sesion = /*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$body2, id_sesion, codigo_producto, cantidad, _yield$poolBetrost$qu1, _yield$poolBetrost$qu10, result, _yield$poolBetrost$qu11, _yield$poolBetrost$qu12, output, mensaje, _t5;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          console.log("📦 Body recibido en /product/agregar:", req.body);
          _req$body2 = req.body, id_sesion = _req$body2.id_sesion, codigo_producto = _req$body2.codigo_producto, cantidad = _req$body2.cantidad; // Validate input parameters
          if (!(!id_sesion || isNaN(id_sesion) || id_sesion <= 0)) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", (0, _browser.error)(req, res, 400, "El ID de la sesión debe ser un número entero positivo"));
        case 1:
          if (!(!codigo_producto || typeof codigo_producto !== "string" || codigo_producto.trim() === "")) {
            _context5.next = 2;
            break;
          }
          return _context5.abrupt("return", (0, _browser.error)(req, res, 400, "El código del producto debe ser una cadena no vacía"));
        case 2:
          if (!(!cantidad || isNaN(cantidad) || cantidad <= 0)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", (0, _browser.error)(req, res, 400, "La cantidad debe ser un número entero positivo"));
        case 3:
          _context5.prev = 3;
          _context5.next = 4;
          return _mysql["default"].query("CALL sp_agregar_producto_sesion(?, ?, ?, @p_mensaje);", [parseInt(id_sesion), codigo_producto.trim(), parseInt(cantidad)]);
        case 4:
          _yield$poolBetrost$qu1 = _context5.sent;
          _yield$poolBetrost$qu10 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu1, 1);
          result = _yield$poolBetrost$qu10[0];
          _context5.next = 5;
          return _mysql["default"].query("SELECT @p_mensaje AS mensaje");
        case 5:
          _yield$poolBetrost$qu11 = _context5.sent;
          _yield$poolBetrost$qu12 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu11, 1);
          output = _yield$poolBetrost$qu12[0];
          mensaje = output[0].mensaje;
          if (mensaje === "Producto agregado correctamente") {
            (0, _browser.success)(req, res, 200, {
              mensaje: mensaje
            });
          } else {
            (0, _browser.error)(req, res, 400, mensaje);
          }
          _context5.next = 7;
          break;
        case 6:
          _context5.prev = 6;
          _t5 = _context5["catch"](3);
          console.error("Error al agregar producto a la sesión:", _t5);
          _t5(req, res, 500, "Error interno del servidor al agregar producto a la sesión");
        case 7:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[3, 6]]);
  }));
  return function agregar_producto_sesion(_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}();
var obtener_detalle_sesion = exports.obtener_detalle_sesion = /*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var id_sesion, _yield$poolBetrost$qu13, _yield$poolBetrost$qu14, results, sesion, detalles, _t6;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          id_sesion = req.query.id_sesion; // Validate input parameter
          if (!(!id_sesion || isNaN(id_sesion) || id_sesion <= 0)) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", (0, _browser.error)(req, res, 400, "El ID de la sesión debe ser un número entero positivo"));
        case 1:
          _context6.prev = 1;
          _context6.next = 2;
          return _mysql["default"].query("CALL sp_obtener_detalle_sesion(?);", [parseInt(id_sesion)]);
        case 2:
          _yield$poolBetrost$qu13 = _context6.sent;
          _yield$poolBetrost$qu14 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu13, 1);
          results = _yield$poolBetrost$qu14[0];
          // Extract the two result sets
          sesion = results[0] && results[0].length > 0 ? results[0][0] : null;
          detalles = results[1] || [];
          if (sesion) {
            _context6.next = 3;
            break;
          }
          return _context6.abrupt("return", (0, _browser.error)(req, res, 404, "No se encontró la sesión especificada"));
        case 3:
          // Return both the session summary and product details
          (0, _browser.success)(req, res, 200, {
            sesion: sesion,
            detalles: detalles
          });
          _context6.next = 5;
          break;
        case 4:
          _context6.prev = 4;
          _t6 = _context6["catch"](1);
          console.error("Error al obtener detalle de la sesión:", _t6);
          (0, _browser.error)(req, res, 500, "Error interno del servidor al obtener detalle de la sesión");
        case 5:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 4]]);
  }));
  return function obtener_detalle_sesion(_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}();
var cancelar_sesion_escaneo = exports.cancelar_sesion_escaneo = /*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var id_sesion, _yield$poolBetrost$qu15, _yield$poolBetrost$qu16, result, _yield$poolBetrost$qu17, _yield$poolBetrost$qu18, output, mensaje, _t7;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          id_sesion = req.body.id_sesion; // Validate input parameter
          if (!(!id_sesion || isNaN(id_sesion) || id_sesion <= 0)) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", (0, _browser.error)(req, res, 400, "El ID de la sesión debe ser un número entero positivo"));
        case 1:
          _context7.prev = 1;
          _context7.next = 2;
          return _mysql["default"].query("CALL sp_cancelar_sesion_escaneo(?, @p_mensaje);", [parseInt(id_sesion)]);
        case 2:
          _yield$poolBetrost$qu15 = _context7.sent;
          _yield$poolBetrost$qu16 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu15, 1);
          result = _yield$poolBetrost$qu16[0];
          _context7.next = 3;
          return _mysql["default"].query("SELECT @p_mensaje AS mensaje");
        case 3:
          _yield$poolBetrost$qu17 = _context7.sent;
          _yield$poolBetrost$qu18 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu17, 1);
          output = _yield$poolBetrost$qu18[0];
          mensaje = output[0].mensaje;
          if (mensaje === "Sesión cancelada correctamente") {
            (0, _browser.success)(req, res, 200, {
              mensaje: mensaje
            });
          } else {
            (0, _browser.error)(req, res, 400, mensaje);
          }
          _context7.next = 5;
          break;
        case 4:
          _context7.prev = 4;
          _t7 = _context7["catch"](1);
          console.error("Error al cancelar sesión de escaneo:", _t7);
          (0, _browser.error)(req, res, 500, "Error interno del servidor al cancelar sesión de escaneo");
        case 5:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[1, 4]]);
  }));
  return function cancelar_sesion_escaneo(_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}();
var finalizarSesionEscaneo = exports.finalizarSesionEscaneo = /*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var id_sesion, connection, _yield$connection$que, _yield$connection$que2, _yield$connection$que3, mensaje, _t8;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          id_sesion = req.body.id_sesion;
          if (id_sesion) {
            _context8.next = 1;
            break;
          }
          return _context8.abrupt("return", res.status(400).json({
            error: "El id_sesion es requerido"
          }));
        case 1:
          _context8.prev = 1;
          _context8.next = 2;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 2:
          connection = _context8.sent;
          _context8.prev = 3;
          _context8.next = 4;
          return connection.query("CALL sp_finalizar_sesion_escaneo(?, @mensaje);", [id_sesion]);
        case 4:
          _context8.next = 5;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 5:
          _yield$connection$que = _context8.sent;
          _yield$connection$que2 = (0, _slicedToArray2["default"])(_yield$connection$que, 1);
          _yield$connection$que3 = (0, _slicedToArray2["default"])(_yield$connection$que2[0], 1);
          mensaje = _yield$connection$que3[0].mensaje;
          console.log("📦 MENSAJE DEL SP:", mensaje);
          if (!mensaje.toLowerCase().includes("error")) {
            _context8.next = 6;
            break;
          }
          return _context8.abrupt("return", res.status(400).json({
            mensaje: mensaje
          }));
        case 6:
          res.status(200).json({
            mensaje: mensaje
          });
        case 7:
          _context8.prev = 7;
          connection.release();
          return _context8.finish(7);
        case 8:
          _context8.next = 10;
          break;
        case 9:
          _context8.prev = 9;
          _t8 = _context8["catch"](1);
          console.error("Error al finalizar sesión:", _t8);
          res.status(500).json({
            error: "Error al finalizar la sesión de escaneo"
          });
        case 10:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[1, 9], [3,, 7, 8]]);
  }));
  return function finalizarSesionEscaneo(_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}();
var PREFIJOS_BODEGA = {
  1: "PPC",
  2: "PPM",
  3: "PPI",
  4: "PPV",
  5: "PPG",
  7: "PPG",
  8: "PPG",
  9: "PPG",
  10: "PPG",
  11: "PPG",
  12: "PPG",
  13: "PPG",
  14: "PPG",
  15: "PPG",
  16: "PPG",
  17: "PPG",
  18: "PPG",
  19: "PPG",
  20: "PPM",
  21: "PPM",
  22: "PPV",
  23: "PPG"
};
var obtenerPrefijoBodega = function obtenerPrefijoBodega(idBodegaOrigen) {
  return PREFIJOS_BODEGA[idBodegaOrigen] || "PPG";
};
var construirCodigoModificado = function construirCodigoModificado(codigoProducto) {
  var caracteristica = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  if (!caracteristica) return codigoProducto;
  return "".concat(codigoProducto.slice(0, -2)).concat(caracteristica).concat(codigoProducto.slice(-2));
};
var construirObservacionFinal = function construirObservacionFinal(_ref9) {
  var observaciones = _ref9.observaciones,
    idBodegaOrigen = _ref9.idBodegaOrigen,
    codigoProducto = _ref9.codigoProducto,
    caracteristica = _ref9.caracteristica;
  var prefijo = obtenerPrefijoBodega(idBodegaOrigen);
  var codigoModificado = construirCodigoModificado(codigoProducto, caracteristica);
  return "".concat(observaciones || "", " ").concat(prefijo).concat(codigoModificado).trim();
};
var transferirProducto = exports.transferirProducto = /*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var connection, _codigo_producto, _observaciones, _tipo_movimiento, _req$body3, id_bodega_origen, id_bodega_destino, codigo_producto, cantidad, observaciones, tipo_movimiento, id_usuario, tiposValidos, _yield$connection$que4, _yield$connection$que5, _yield$connection$que6, usuario, _yield$connection$que7, _yield$connection$que8, _yield$connection$que9, producto, observacionFinal, _yield$connection$que0, _yield$connection$que1, _yield$connection$que10, mensajeResult, mensaje, esError, _t9;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _req$body3 = req.body, id_bodega_origen = _req$body3.id_bodega_origen, id_bodega_destino = _req$body3.id_bodega_destino, codigo_producto = _req$body3.codigo_producto, cantidad = _req$body3.cantidad, observaciones = _req$body3.observaciones, tipo_movimiento = _req$body3.tipo_movimiento;
          id_bodega_origen = Number.parseInt(id_bodega_origen, 10);
          id_bodega_destino = Number.parseInt(id_bodega_destino, 10);
          cantidad = Number.parseInt(cantidad, 10);
          id_usuario = Number.parseInt(req.user.id_usuario, 10);
          codigo_producto = (_codigo_producto = codigo_producto) === null || _codigo_producto === void 0 ? void 0 : _codigo_producto.trim();
          observaciones = ((_observaciones = observaciones) === null || _observaciones === void 0 ? void 0 : _observaciones.trim()) || "";
          tipo_movimiento = (_tipo_movimiento = tipo_movimiento) === null || _tipo_movimiento === void 0 || (_tipo_movimiento = _tipo_movimiento.trim()) === null || _tipo_movimiento === void 0 ? void 0 : _tipo_movimiento.toUpperCase();
          if (!(Number.isNaN(id_bodega_origen) || Number.isNaN(id_bodega_destino) || Number.isNaN(cantidad) || Number.isNaN(id_usuario) || !codigo_producto || !tipo_movimiento)) {
            _context9.next = 1;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 400, "Faltan campos requeridos para la transferencia"));
        case 1:
          if (!(cantidad <= 0)) {
            _context9.next = 2;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 400, "La cantidad debe ser mayor a 0"));
        case 2:
          if (!(id_bodega_origen === id_bodega_destino)) {
            _context9.next = 3;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 400, "La bodega origen y destino no pueden ser iguales"));
        case 3:
          tiposValidos = ["ENTRADA", "PROCESO", "COMPLETO"];
          if (tiposValidos.includes(tipo_movimiento)) {
            _context9.next = 4;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 400, "Tipo de movimiento invalido"));
        case 4:
          _context9.next = 5;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 5:
          connection = _context9.sent;
          _context9.next = 6;
          return connection.query("SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1", [id_usuario]);
        case 6:
          _yield$connection$que4 = _context9.sent;
          _yield$connection$que5 = (0, _slicedToArray2["default"])(_yield$connection$que4, 1);
          _yield$connection$que6 = (0, _slicedToArray2["default"])(_yield$connection$que5[0], 1);
          usuario = _yield$connection$que6[0];
          if (usuario) {
            _context9.next = 7;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 404, "Usuario no existe"));
        case 7:
          _context9.next = 8;
          return connection.query("\n    SELECT \n      id_producto,\n      codigo,\n      estado,\n      IFNULL(caracteristica, '') AS caracteristica\n    FROM productos\n    WHERE TRIM(codigo) = TRIM(?)\n      AND UPPER(TRIM(estado)) = 'ACTIVO'\n    LIMIT 1\n  ", [codigo_producto]);
        case 8:
          _yield$connection$que7 = _context9.sent;
          _yield$connection$que8 = (0, _slicedToArray2["default"])(_yield$connection$que7, 1);
          _yield$connection$que9 = (0, _slicedToArray2["default"])(_yield$connection$que8[0], 1);
          producto = _yield$connection$que9[0];
          if (producto) {
            _context9.next = 9;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 404, "Producto no encontrado"));
        case 9:
          observacionFinal = construirObservacionFinal({
            observaciones: observaciones,
            idBodegaOrigen: id_bodega_origen,
            codigoProducto: codigo_producto,
            caracteristica: producto.caracteristica
          });
          _context9.next = 10;
          return connection.query("CALL sp_transferir_productos(?, ?, ?, ?, ?, ?, ?, @mensaje);", [id_bodega_origen, id_bodega_destino, codigo_producto, cantidad, id_usuario, observacionFinal, tipo_movimiento]);
        case 10:
          _context9.next = 11;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 11:
          _yield$connection$que0 = _context9.sent;
          _yield$connection$que1 = (0, _slicedToArray2["default"])(_yield$connection$que0, 1);
          _yield$connection$que10 = (0, _slicedToArray2["default"])(_yield$connection$que1[0], 1);
          mensajeResult = _yield$connection$que10[0];
          mensaje = (mensajeResult === null || mensajeResult === void 0 ? void 0 : mensajeResult.mensaje) || "Respuesta desconocida";
          esError = ["stock insuficiente", "error", "no existe", "no encontrado"].some(function (texto) {
            return mensaje.toLowerCase().includes(texto);
          });
          if (!esError) {
            _context9.next = 12;
            break;
          }
          return _context9.abrupt("return", (0, _browser.error)(req, res, 400, mensaje));
        case 12:
          return _context9.abrupt("return", (0, _browser.success)(req, res, 200, {
            mensaje: mensaje
          }, "PRODUCTO TRANSFERIDO EXITOSAMENTE"));
        case 13:
          _context9.prev = 13;
          _t9 = _context9["catch"](0);
          console.error("Error transferencia:", {
            error: _t9.message,
            body: req.body
          });
          return _context9.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al transferir producto"));
        case 14:
          _context9.prev = 14;
          if (connection) connection.release();
          return _context9.finish(14);
        case 15:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[0, 13, 14, 15]]);
  }));
  return function transferirProducto(_x15, _x16) {
    return _ref0.apply(this, arguments);
  };
}();
var finalizarProductoTerminada = exports.finalizarProductoTerminada = /*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var _codigo_producto2, _caracteristica, _tipo_movimiento2;
    var _req$body4, codigo_producto, caracteristica, cantidad, id_bodega_origen, id_bodega_destino, tipo_movimiento, id_usuario, tiposValidos, connection, _yield$connection$que11, _yield$connection$que12, _yield$connection$que13, usuario, baseCodigo, codigoFinal, _yield$connection$que14, _yield$connection$que15, _yield$connection$que16, producto, bodegaConsumo, bodegaDestino, crearProductoNuevo, observacion, _yield$connection$que17, _yield$connection$que18, _yield$connection$que19, mensaje, esError, _t0;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          _req$body4 = req.body, codigo_producto = _req$body4.codigo_producto, caracteristica = _req$body4.caracteristica, cantidad = _req$body4.cantidad, id_bodega_origen = _req$body4.id_bodega_origen, id_bodega_destino = _req$body4.id_bodega_destino, tipo_movimiento = _req$body4.tipo_movimiento;
          id_bodega_origen = Number.parseInt(id_bodega_origen, 10);
          id_bodega_destino = Number.parseInt(id_bodega_destino, 10) || id_bodega_origen;
          cantidad = Number.parseInt(cantidad, 10);
          id_usuario = Number.parseInt(req.user.id_usuario, 10);
          codigo_producto = (_codigo_producto2 = codigo_producto) === null || _codigo_producto2 === void 0 ? void 0 : _codigo_producto2.trim();
          caracteristica = ((_caracteristica = caracteristica) === null || _caracteristica === void 0 ? void 0 : _caracteristica.trim()) || "";
          tipo_movimiento = ((_tipo_movimiento2 = tipo_movimiento) === null || _tipo_movimiento2 === void 0 || (_tipo_movimiento2 = _tipo_movimiento2.trim()) === null || _tipo_movimiento2 === void 0 ? void 0 : _tipo_movimiento2.toUpperCase()) || "COMPLETO";
          if (!(Number.isNaN(id_bodega_origen) || Number.isNaN(cantidad) || Number.isNaN(id_usuario) || !codigo_producto)) {
            _context0.next = 1;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 400, "Faltan campos requeridos para finalizar el producto"));
        case 1:
          if (!(cantidad <= 0)) {
            _context0.next = 2;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 400, "La cantidad debe ser mayor a 0"));
        case 2:
          if (caracteristica) {
            _context0.next = 3;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 400, "La característica es obligatoria"));
        case 3:
          // Agregar cero adelante si la característica tiene menos de 4 caracteres (ej: 30P → 030P)
          if (caracteristica.length < 4) {
            caracteristica = caracteristica.padStart(4, "0");
          }
          tiposValidos = ["ENTRADA", "PROCESO", "COMPLETO"];
          if (tiposValidos.includes(tipo_movimiento)) {
            _context0.next = 4;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 400, "Tipo de movimiento inválido"));
        case 4:
          _context0.prev = 4;
          _context0.next = 5;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 5:
          connection = _context0.sent;
          _context0.next = 6;
          return connection.query("SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1", [id_usuario]);
        case 6:
          _yield$connection$que11 = _context0.sent;
          _yield$connection$que12 = (0, _slicedToArray2["default"])(_yield$connection$que11, 1);
          _yield$connection$que13 = (0, _slicedToArray2["default"])(_yield$connection$que12[0], 1);
          usuario = _yield$connection$que13[0];
          if (usuario) {
            _context0.next = 7;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 404, "Usuario no existe"));
        case 7:
          // 2. Quitar prefijo si viene con el (PPC/PPG/PPM/PPI/PPV/PPT)
          baseCodigo = codigo_producto;
          if (/^(PPC|PPG|PPM|PPI|PPV|PPT)/.test(codigo_producto)) {
            baseCodigo = codigo_producto.substring(3);
          }

          // 3. Validar que el código base tenga suficientes caracteres
          if (!(baseCodigo.length < 3)) {
            _context0.next = 8;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 400, "Código demasiado corto"));
        case 8:
          // 4. Construir código final: base[0..-2] + caracteristica + base[-2..]
          codigoFinal = baseCodigo.slice(0, -2) + caracteristica + baseCodigo.slice(-2); // 5. Obtener producto origen
          _context0.next = 9;
          return connection.query("SELECT id_producto FROM productos WHERE codigo = ? AND estado = 'ACTIVO' LIMIT 1", [baseCodigo]);
        case 9:
          _yield$connection$que14 = _context0.sent;
          _yield$connection$que15 = (0, _slicedToArray2["default"])(_yield$connection$que14, 1);
          _yield$connection$que16 = (0, _slicedToArray2["default"])(_yield$connection$que15[0], 1);
          producto = _yield$connection$que16[0];
          if (producto) {
            _context0.next = 10;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 404, "Producto no encontrado"));
        case 10:
          // Terminada Completo (25) + COMPLETO → consume de Terminada Proceso (6) → crea producto nuevo
          if (id_bodega_origen === 25 && tipo_movimiento === "COMPLETO") {
            bodegaConsumo = 6;
            bodegaDestino = 25;
            crearProductoNuevo = 1;
          }
          // Terminada Proceso (6) + PROCESO/ENTRADA → consume de Montaje Completo (21) → genera código con característica
          else if (id_bodega_origen === 6 && ["PROCESO", "ENTRADA"].includes(tipo_movimiento)) {
            bodegaConsumo = 21;
            bodegaDestino = 6;
            crearProductoNuevo = 1;
          }
          // Flujo normal
          else {
            bodegaConsumo = id_bodega_origen;
            bodegaDestino = id_bodega_destino;
            crearProductoNuevo = 1;
          }

          // 7. Construir observación
          observacion = "".concat(crearProductoNuevo ? codigoFinal : baseCodigo); // 8. Llamar SP simplificado
          _context0.next = 11;
          return connection.query("CALL sp_finalizar_producto_terminada(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @mensaje);", [producto.id_producto, crearProductoNuevo ? codigoFinal : baseCodigo, caracteristica, cantidad, bodegaConsumo, bodegaDestino, id_usuario, tipo_movimiento, observacion, crearProductoNuevo]);
        case 11:
          _context0.next = 12;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 12:
          _yield$connection$que17 = _context0.sent;
          _yield$connection$que18 = (0, _slicedToArray2["default"])(_yield$connection$que17, 1);
          _yield$connection$que19 = (0, _slicedToArray2["default"])(_yield$connection$que18[0], 1);
          mensaje = _yield$connection$que19[0].mensaje;
          esError = ["insuficiente", "error"].some(function (texto) {
            return mensaje.toLowerCase().includes(texto);
          });
          if (!esError) {
            _context0.next = 13;
            break;
          }
          return _context0.abrupt("return", (0, _browser.error)(req, res, 400, mensaje));
        case 13:
          return _context0.abrupt("return", (0, _browser.success)(req, res, 200, {
            mensaje: mensaje,
            codigo: crearProductoNuevo ? codigoFinal : baseCodigo
          }, "PRODUCTO FINALIZADO EN TERMINADA EXITOSAMENTE"));
        case 14:
          _context0.prev = 14;
          _t0 = _context0["catch"](4);
          console.error("Error al finalizar producto en terminada:", _t0);
          return _context0.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al finalizar producto en terminada"));
        case 15:
          _context0.prev = 15;
          if (connection) connection.release();
          return _context0.finish(15);
        case 16:
        case "end":
          return _context0.stop();
      }
    }, _callee0, null, [[4, 14, 15, 16]]);
  }));
  return function finalizarProductoTerminada(_x17, _x18) {
    return _ref1.apply(this, arguments);
  };
}();
var ajustarInventario = exports.ajustarInventario = /*#__PURE__*/function () {
  var _ref10 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(req, res) {
    var _req$body5, id_bodega, codigo_producto, nueva_cantidad, motivo, id_usuario, connection, _yield$connection$que20, _yield$connection$que21, _yield$connection$que22, mensaje, _t1;
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          _req$body5 = req.body, id_bodega = _req$body5.id_bodega, codigo_producto = _req$body5.codigo_producto, nueva_cantidad = _req$body5.nueva_cantidad, motivo = _req$body5.motivo;
          if (!(!id_bodega || !codigo_producto || nueva_cantidad === undefined)) {
            _context1.next = 1;
            break;
          }
          return _context1.abrupt("return", res.status(400).json({
            error: "Faltan campos obligatorios"
          }));
        case 1:
          id_usuario = Number.parseInt(req.user.id_usuario, 10);
          _context1.prev = 2;
          _context1.next = 3;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 3:
          connection = _context1.sent;
          _context1.prev = 4;
          _context1.next = 5;
          return connection.query("CALL sp_ajustar_inventario(?, ?, ?, ?, ?, @mensaje);", [id_bodega, codigo_producto, nueva_cantidad, id_usuario, motivo || ""]);
        case 5:
          _context1.next = 6;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 6:
          _yield$connection$que20 = _context1.sent;
          _yield$connection$que21 = (0, _slicedToArray2["default"])(_yield$connection$que20, 1);
          _yield$connection$que22 = (0, _slicedToArray2["default"])(_yield$connection$que21[0], 1);
          mensaje = _yield$connection$que22[0].mensaje;
          res.status(200).json({
            mensaje: mensaje
          });
        case 7:
          _context1.prev = 7;
          connection.release();
          return _context1.finish(7);
        case 8:
          _context1.next = 10;
          break;
        case 9:
          _context1.prev = 9;
          _t1 = _context1["catch"](2);
          console.error("Error al ajustar inventario:", _t1);
          res.status(500).json({
            error: "Error interno al ajustar inventario"
          });
        case 10:
        case "end":
          return _context1.stop();
      }
    }, _callee1, null, [[2, 9], [4,, 7, 8]]);
  }));
  return function ajustarInventario(_x19, _x20) {
    return _ref10.apply(this, arguments);
  };
}();
var crear_producto = exports.crear_producto = /*#__PURE__*/function () {
  var _ref11 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(req, res) {
    var _req$body6, codigo, caracteristica, _t10;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          _req$body6 = req.body, codigo = _req$body6.codigo, caracteristica = _req$body6.caracteristica; // Validar el código
          if (!(!codigo || typeof codigo !== "string" || codigo.trim() === "")) {
            _context10.next = 1;
            break;
          }
          return _context10.abrupt("return", (0, _browser.error)(req, res, 400, "El código es obligatorio y debe ser texto."));
        case 1:
          // Si no hay caracteristica, usar "N/A" por defecto
          if (!caracteristica || typeof caracteristica !== "string" || caracteristica.trim() === "") {
            caracteristica = "";
          }
          _context10.prev = 2;
          _context10.next = 3;
          return _mysql["default"].query("CALL sp_crear_producto(?, ?)", [codigo.trim(), caracteristica.trim()]);
        case 3:
          (0, _browser.success)(req, res, 200, {
            mensaje: "Producto creado correctamente."
          });
          _context10.next = 6;
          break;
        case 4:
          _context10.prev = 4;
          _t10 = _context10["catch"](2);
          console.error("Error al crear producto:", _t10);
          if (!(_t10.errno === 1062)) {
            _context10.next = 5;
            break;
          }
          return _context10.abrupt("return", (0, _browser.error)(req, res, 400, "El código ya está registrado o está inactivo."));
        case 5:
          (0, _browser.error)(req, res, 500, "Error interno del servidor al crear el producto.");
        case 6:
        case "end":
          return _context10.stop();
      }
    }, _callee10, null, [[2, 4]]);
  }));
  return function crear_producto(_x21, _x22) {
    return _ref11.apply(this, arguments);
  };
}();
var actualizarCaracteristica = exports.actualizarCaracteristica = /*#__PURE__*/function () {
  var _ref12 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(req, res) {
    var _req$body7, codigo_producto, nueva_caracteristica, connection, _yield$connection$que23, _yield$connection$que24, result, _yield$connection$que25, _yield$connection$que26, mensajeResult, mensaje, _t11;
    return _regenerator["default"].wrap(function (_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          console.log("BODY RECIBIDO:", req.body);
          _req$body7 = req.body, codigo_producto = _req$body7.codigo_producto, nueva_caracteristica = _req$body7.nueva_caracteristica;
          if (!(!codigo_producto || !nueva_caracteristica)) {
            _context11.next = 1;
            break;
          }
          return _context11.abrupt("return", res.status(400).json({
            error: "Faltan datos"
          }));
        case 1:
          _context11.prev = 1;
          _context11.next = 2;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 2:
          connection = _context11.sent;
          _context11.prev = 3;
          _context11.next = 4;
          return connection.query("CALL sp_actualizar_caracteristica_producto(?, ?, @mensaje);", [codigo_producto, nueva_caracteristica]);
        case 4:
          _yield$connection$que23 = _context11.sent;
          _yield$connection$que24 = (0, _slicedToArray2["default"])(_yield$connection$que23, 1);
          result = _yield$connection$que24[0];
          _context11.next = 5;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 5:
          _yield$connection$que25 = _context11.sent;
          _yield$connection$que26 = (0, _slicedToArray2["default"])(_yield$connection$que25, 1);
          mensajeResult = _yield$connection$que26[0];
          mensaje = mensajeResult[0].mensaje;
          console.log("MENSAJE SP:", mensaje);
          res.status(200).json({
            mensaje: mensaje
          });
        case 6:
          _context11.prev = 6;
          connection.release();
          return _context11.finish(6);
        case 7:
          _context11.next = 9;
          break;
        case 8:
          _context11.prev = 8;
          _t11 = _context11["catch"](1);
          console.error("Error al actualizar característica:", _t11);
          res.status(500).json({
            error: "Error interno del servidor"
          });
        case 9:
        case "end":
          return _context11.stop();
      }
    }, _callee11, null, [[1, 8], [3,, 6, 7]]);
  }));
  return function actualizarCaracteristica(_x23, _x24) {
    return _ref12.apply(this, arguments);
  };
}();

// CONTROLADORES PARA LA CONSULTA CREAR MODIFICAR O INHABILITAR PRODUCTOS EN EL CATALOGO

var consultarCodigo = exports.consultarCodigo = /*#__PURE__*/function () {
  var _ref13 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(req, res) {
    var codigo_barras, _yield$poolBetrost$qu19, _yield$poolBetrost$qu20, rows, _t12;
    return _regenerator["default"].wrap(function (_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          codigo_barras = req.body.codigo_barras;
          if (codigo_barras) {
            _context12.next = 1;
            break;
          }
          return _context12.abrupt("return", res.status(400).json({
            ok: false,
            mensaje: "Código requerido"
          }));
        case 1:
          _context12.prev = 1;
          _context12.next = 2;
          return _mysql["default"].query("\n            SELECT \nid_catalogo,\nreferencia,\nsku,\ncodigo_barras,\nfecha_creacion,\nestado\n            FROM catalogo_productos\n            WHERE codigo_barras = ?\n            AND estado = 1\n            ", [codigo_barras]);
        case 2:
          _yield$poolBetrost$qu19 = _context12.sent;
          _yield$poolBetrost$qu20 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu19, 1);
          rows = _yield$poolBetrost$qu20[0];
          if (rows.length) {
            _context12.next = 3;
            break;
          }
          return _context12.abrupt("return", res.status(404).json({
            ok: false,
            mensaje: "Código no registrado"
          }));
        case 3:
          return _context12.abrupt("return", res.status(200).json({
            ok: true,
            producto: rows[0]
          }));
        case 4:
          _context12.prev = 4;
          _t12 = _context12["catch"](1);
          console.error(_t12);
          return _context12.abrupt("return", res.status(500).json({
            ok: false,
            mensaje: "Error interno"
          }));
        case 5:
        case "end":
          return _context12.stop();
      }
    }, _callee12, null, [[1, 4]]);
  }));
  return function consultarCodigo(_x25, _x26) {
    return _ref13.apply(this, arguments);
  };
}();
var listar_catalogo = exports.listar_catalogo = /*#__PURE__*/function () {
  var _ref14 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(req, res) {
    var _normalizarPaginacion, limit, offset, busqueda, where, params, total, _yield$poolBetrost$qu21, _yield$poolBetrost$qu22, rows, _t13;
    return _regenerator["default"].wrap(function (_context13) {
      while (1) switch (_context13.prev = _context13.next) {
        case 0:
          _normalizarPaginacion = (0, _paginacion.normalizarPaginacion)(req.query), limit = _normalizarPaginacion.limit, offset = _normalizarPaginacion.offset; // El buscador del frontend filtra por estas mismas tres columnas, así
          // que el filtro viaja al servidor en lugar de recorrer la tabla entera
          // en el navegador.
          busqueda = (req.query.buscar || "").trim();
          where = busqueda ? "(codigo_barras LIKE ? OR sku LIKE ? OR referencia LIKE ?)" : "";
          params = busqueda ? Array(3).fill("%".concat(busqueda, "%")) : [];
          _context13.prev = 1;
          _context13.next = 2;
          return (0, _paginacion.contarFilas)(_mysql["default"], "catalogo_productos", where, params);
        case 2:
          total = _context13.sent;
          _context13.next = 3;
          return _mysql["default"].query("SELECT\n  id_catalogo,\n  referencia,\n  sku,\n  codigo_barras,\n  fecha_creacion,\n  estado\nFROM catalogo_productos\n".concat(where ? "WHERE ".concat(where) : "", "\nORDER BY id_catalogo DESC\nLIMIT ? OFFSET ?"), [].concat((0, _toConsumableArray2["default"])(params), [limit, offset]));
        case 3:
          _yield$poolBetrost$qu21 = _context13.sent;
          _yield$poolBetrost$qu22 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu21, 1);
          rows = _yield$poolBetrost$qu22[0];
          (0, _paginacion.enviarTotalCount)(res, total);
          return _context13.abrupt("return", (0, _browser.success)(req, res, 200, rows));
        case 4:
          _context13.prev = 4;
          _t13 = _context13["catch"](1);
          console.error(_t13);
          return _context13.abrupt("return", (0, _browser.error)(req, res, 500, "Error consultando catálogo"));
        case 5:
        case "end":
          return _context13.stop();
      }
    }, _callee13, null, [[1, 4]]);
  }));
  return function listar_catalogo(_x27, _x28) {
    return _ref14.apply(this, arguments);
  };
}();
var crear_catalogo = exports.crear_catalogo = /*#__PURE__*/function () {
  var _ref15 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(req, res) {
    var _req$body8, referencia, sku, codigo_barras, _resultado$insertId, _yield$poolBetrost$qu23, _yield$poolBetrost$qu24, resultado, _t14;
    return _regenerator["default"].wrap(function (_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          _req$body8 = req.body, referencia = _req$body8.referencia, sku = _req$body8.sku, codigo_barras = _req$body8.codigo_barras;
          if (!(!referencia || !sku || !codigo_barras)) {
            _context14.next = 1;
            break;
          }
          return _context14.abrupt("return", (0, _browser.error)(req, res, 400, "Todos los campos son obligatorios"));
        case 1:
          _context14.prev = 1;
          _context14.next = 2;
          return _mysql["default"].query("\nINSERT INTO catalogo_productos\n(\nreferencia,\nsku,\ncodigo_barras,\nfecha_creacion,\nestado\n)\n\nVALUES\n(?,?,?,NOW(),1)\n\n", [referencia, sku, codigo_barras]);
        case 2:
          _yield$poolBetrost$qu23 = _context14.sent;
          _yield$poolBetrost$qu24 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu23, 1);
          resultado = _yield$poolBetrost$qu24[0];
          _context14.next = 3;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "catalogo_productos",
            accion: "CREAR",
            id_registro: (_resultado$insertId = resultado.insertId) !== null && _resultado$insertId !== void 0 ? _resultado$insertId : null,
            datos_despues: {
              referencia: referencia,
              sku: sku,
              codigo_barras: codigo_barras,
              estado: 1
            }
          });
        case 3:
          return _context14.abrupt("return", (0, _browser.success)(req, res, 200, {
            mensaje: "Producto agregado al catálogo"
          }));
        case 4:
          _context14.prev = 4;
          _t14 = _context14["catch"](1);
          console.error(_t14);
          if (!(_t14.errno === 1062)) {
            _context14.next = 5;
            break;
          }
          return _context14.abrupt("return", (0, _browser.error)(req, res, 400, "El código ya existe"));
        case 5:
          return _context14.abrupt("return", (0, _browser.error)(req, res, 500, "Error creando producto"));
        case 6:
        case "end":
          return _context14.stop();
      }
    }, _callee14, null, [[1, 4]]);
  }));
  return function crear_catalogo(_x29, _x30) {
    return _ref15.apply(this, arguments);
  };
}();
var actualizar_catalogo = exports.actualizar_catalogo = /*#__PURE__*/function () {
  var _ref16 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(req, res) {
    var _req$body9, id_catalogo, referencia, sku, codigo_barras, _yield$poolBetrost$qu25, _yield$poolBetrost$qu26, previo, _t15;
    return _regenerator["default"].wrap(function (_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          _req$body9 = req.body, id_catalogo = _req$body9.id_catalogo, referencia = _req$body9.referencia, sku = _req$body9.sku, codigo_barras = _req$body9.codigo_barras;
          _context15.prev = 1;
          _context15.next = 2;
          return _mysql["default"].query("SELECT referencia, sku, codigo_barras FROM catalogo_productos WHERE id_catalogo = ?", [id_catalogo]);
        case 2:
          _yield$poolBetrost$qu25 = _context15.sent;
          _yield$poolBetrost$qu26 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu25, 1);
          previo = _yield$poolBetrost$qu26[0];
          _context15.next = 3;
          return _mysql["default"].query("\n\nUPDATE catalogo_productos\n\nSET\n\nreferencia=?,\nsku=?,\ncodigo_barras=?\n\nWHERE id_catalogo=?\n\n\n", [referencia, sku, codigo_barras, id_catalogo]);
        case 3:
          _context15.next = 4;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "catalogo_productos",
            accion: "MODIFICAR",
            id_registro: id_catalogo !== null && id_catalogo !== void 0 ? id_catalogo : null,
            datos_antes: (0, _auditoria.recortarFila)(previo[0], ["referencia", "sku", "codigo_barras"]),
            datos_despues: {
              referencia: referencia,
              sku: sku,
              codigo_barras: codigo_barras
            }
          });
        case 4:
          return _context15.abrupt("return", (0, _browser.success)(req, res, 200, {
            mensaje: "Catálogo actualizado"
          }));
        case 5:
          _context15.prev = 5;
          _t15 = _context15["catch"](1);
          console.error(_t15);
          return _context15.abrupt("return", (0, _browser.error)(req, res, 500, "Error actualizando catálogo"));
        case 6:
        case "end":
          return _context15.stop();
      }
    }, _callee15, null, [[1, 5]]);
  }));
  return function actualizar_catalogo(_x31, _x32) {
    return _ref16.apply(this, arguments);
  };
}();
var inhabilitar_catalogo = exports.inhabilitar_catalogo = /*#__PURE__*/function () {
  var _ref17 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(req, res) {
    var id_catalogo, _yield$poolBetrost$qu27, _yield$poolBetrost$qu28, previo, _yield$poolBetrost$qu29, _yield$poolBetrost$qu30, resultado, _t16;
    return _regenerator["default"].wrap(function (_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          id_catalogo = req.body.id_catalogo;
          if (id_catalogo) {
            _context16.next = 1;
            break;
          }
          return _context16.abrupt("return", res.status(400).json({
            ok: false,
            mensaje: "ID del producto requerido"
          }));
        case 1:
          _context16.prev = 1;
          _context16.next = 2;
          return _mysql["default"].query("SELECT estado FROM catalogo_productos WHERE id_catalogo = ?", [id_catalogo]);
        case 2:
          _yield$poolBetrost$qu27 = _context16.sent;
          _yield$poolBetrost$qu28 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu27, 1);
          previo = _yield$poolBetrost$qu28[0];
          _context16.next = 3;
          return _mysql["default"].query("\n      UPDATE catalogo_productos\n      SET estado='INACTIVO'\n      WHERE id_catalogo=?\n      ", [id_catalogo]);
        case 3:
          _yield$poolBetrost$qu29 = _context16.sent;
          _yield$poolBetrost$qu30 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu29, 1);
          resultado = _yield$poolBetrost$qu30[0];
          if (!(resultado.affectedRows === 0)) {
            _context16.next = 4;
            break;
          }
          return _context16.abrupt("return", res.status(404).json({
            ok: false,
            mensaje: "Producto no encontrado"
          }));
        case 4:
          _context16.next = 5;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "catalogo_productos",
            accion: "CAMBIAR_ESTADO",
            id_registro: id_catalogo,
            datos_antes: (0, _auditoria.recortarFila)(previo[0], ["estado"]),
            datos_despues: {
              estado: "INACTIVO"
            }
          });
        case 5:
          return _context16.abrupt("return", res.status(200).json({
            ok: true,
            mensaje: "Producto inhabilitado correctamente"
          }));
        case 6:
          _context16.prev = 6;
          _t16 = _context16["catch"](1);
          console.error("ERROR INHABILITAR:", _t16);
          return _context16.abrupt("return", res.status(500).json({
            ok: false,
            mensaje: "Error interno al inhabilitar producto"
          }));
        case 7:
        case "end":
          return _context16.stop();
      }
    }, _callee16, null, [[1, 6]]);
  }));
  return function inhabilitar_catalogo(_x33, _x34) {
    return _ref17.apply(this, arguments);
  };
}();

// ============================================================
// CONSUMO A LOGÍSTICA (Terminada Completo 25 → Logística 27)
// ============================================================

var BODEGA_TERMINADA_COMPLETO = 25;
var BODEGA_LOGISTICA = 27;
var BODEGA_TERMINADA_PROCESO = 6;
var consultarConsumoLogistica = exports.consultarConsumoLogistica = /*#__PURE__*/function () {
  var _ref18 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(req, res) {
    var codigo_barras, barcode, _yield$poolBetrost$qu31, _yield$poolBetrost$qu32, rows, catalogo, talla, codigoProducto, _yield$poolBetrost$qu33, _yield$poolBetrost$qu34, productoRows, producto, _t17;
    return _regenerator["default"].wrap(function (_context17) {
      while (1) switch (_context17.prev = _context17.next) {
        case 0:
          codigo_barras = req.query.codigo_barras;
          if (!(!codigo_barras || typeof codigo_barras !== "string" || codigo_barras.trim() === "")) {
            _context17.next = 1;
            break;
          }
          return _context17.abrupt("return", (0, _browser.error)(req, res, 400, "El código de barras es obligatorio"));
        case 1:
          barcode = codigo_barras.trim();
          _context17.prev = 2;
          _context17.next = 3;
          return _mysql["default"].query("\n      SELECT\n        id_catalogo,\n        referencia,\n        sku,\n        codigo_barras\n      FROM catalogo_productos\n      WHERE codigo_barras = ?\n      AND estado = 1\n      LIMIT 1\n      ", [barcode]);
        case 3:
          _yield$poolBetrost$qu31 = _context17.sent;
          _yield$poolBetrost$qu32 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu31, 1);
          rows = _yield$poolBetrost$qu32[0];
          if (rows.length) {
            _context17.next = 4;
            break;
          }
          return _context17.abrupt("return", (0, _browser.error)(req, res, 404, "Código de barras no registrado en el catálogo"));
        case 4:
          catalogo = rows[0];
          talla = barcode.slice(-2);
          codigoProducto = "".concat(catalogo.referencia).concat(talla); // 2. Buscar el producto y su stock en Terminada Completo (25)
          _context17.next = 5;
          return _mysql["default"].query("\n      SELECT\n        p.id_producto,\n        p.codigo,\n        p.caracteristica,\n        IFNULL(i.cantidad_disponible, 0) AS stock_disponible\n      FROM productos p\n      LEFT JOIN inventario i  \n        ON i.id_producto = p.id_producto\n       AND i.id_bodega = ?\n      WHERE p.codigo = ?\n        AND p.estado = 'ACTIVO'\n      LIMIT 1\n      ", [BODEGA_TERMINADA_COMPLETO, codigoProducto]);
        case 5:
          _yield$poolBetrost$qu33 = _context17.sent;
          _yield$poolBetrost$qu34 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu33, 1);
          productoRows = _yield$poolBetrost$qu34[0];
          producto = productoRows[0] || null;
          return _context17.abrupt("return", (0, _browser.success)(req, res, 200, {
            codigo_barras: barcode,
            referencia: catalogo.referencia,
            sku: catalogo.sku,
            talla: talla,
            codigo_producto: codigoProducto,
            id_producto: producto ? producto.id_producto : null,
            caracteristica: producto ? producto.caracteristica : "",
            stock_disponible: producto ? producto.stock_disponible : 0,
            bodega_terminada_completo: BODEGA_TERMINADA_COMPLETO,
            bodega_logistica: BODEGA_LOGISTICA
          }));
        case 6:
          _context17.prev = 6;
          _t17 = _context17["catch"](2);
          console.error("Error consultando consumo logística:", _t17);
          return _context17.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al consultar el producto"));
        case 7:
        case "end":
          return _context17.stop();
      }
    }, _callee17, null, [[2, 6]]);
  }));
  return function consultarConsumoLogistica(_x35, _x36) {
    return _ref18.apply(this, arguments);
  };
}();
var ejecutarConsumoLogistica = exports.ejecutarConsumoLogistica = /*#__PURE__*/function () {
  var _ref19 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee18(req, res) {
    var _codigo_producto3, _observaciones2;
    var _req$body0, codigo_producto, cantidad, observaciones, id_usuario, connection, _yield$connection$que27, _yield$connection$que28, _yield$connection$que29, usuario, _yield$connection$que30, _yield$connection$que31, _yield$connection$que32, producto, _yield$connection$que33, _yield$connection$que34, _yield$connection$que35, mensajeResult, mensaje, esError, _t18;
    return _regenerator["default"].wrap(function (_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          _req$body0 = req.body, codigo_producto = _req$body0.codigo_producto, cantidad = _req$body0.cantidad, observaciones = _req$body0.observaciones;
          codigo_producto = (_codigo_producto3 = codigo_producto) === null || _codigo_producto3 === void 0 ? void 0 : _codigo_producto3.trim();
          cantidad = Number.parseInt(cantidad, 10);
          id_usuario = Number.parseInt(req.user.id_usuario, 10);
          observaciones = ((_observaciones2 = observaciones) === null || _observaciones2 === void 0 ? void 0 : _observaciones2.trim()) || "";
          if (!(!codigo_producto || Number.isNaN(cantidad) || cantidad <= 0)) {
            _context18.next = 1;
            break;
          }
          return _context18.abrupt("return", (0, _browser.error)(req, res, 400, "Código del producto y cantidad son obligatorios"));
        case 1:
          _context18.prev = 1;
          _context18.next = 2;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 2:
          connection = _context18.sent;
          _context18.next = 3;
          return connection.query("SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1", [id_usuario]);
        case 3:
          _yield$connection$que27 = _context18.sent;
          _yield$connection$que28 = (0, _slicedToArray2["default"])(_yield$connection$que27, 1);
          _yield$connection$que29 = (0, _slicedToArray2["default"])(_yield$connection$que28[0], 1);
          usuario = _yield$connection$que29[0];
          if (usuario) {
            _context18.next = 4;
            break;
          }
          return _context18.abrupt("return", (0, _browser.error)(req, res, 404, "Usuario no existe"));
        case 4:
          _context18.next = 5;
          return connection.query("\n      SELECT id_producto\n      FROM productos\n      WHERE codigo = ? AND estado = 'ACTIVO'\n      LIMIT 1\n      ", [codigo_producto]);
        case 5:
          _yield$connection$que30 = _context18.sent;
          _yield$connection$que31 = (0, _slicedToArray2["default"])(_yield$connection$que30, 1);
          _yield$connection$que32 = (0, _slicedToArray2["default"])(_yield$connection$que31[0], 1);
          producto = _yield$connection$que32[0];
          if (producto) {
            _context18.next = 6;
            break;
          }
          return _context18.abrupt("return", (0, _browser.error)(req, res, 404, "Producto no encontrado"));
        case 6:
          _context18.next = 7;
          return connection.query("CALL sp_consumo_logistica(?, ?, ?, ?, ?, ?, @mensaje);", [BODEGA_TERMINADA_COMPLETO, BODEGA_LOGISTICA, codigo_producto, cantidad, id_usuario, observaciones]);
        case 7:
          _context18.next = 8;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 8:
          _yield$connection$que33 = _context18.sent;
          _yield$connection$que34 = (0, _slicedToArray2["default"])(_yield$connection$que33, 1);
          _yield$connection$que35 = (0, _slicedToArray2["default"])(_yield$connection$que34[0], 1);
          mensajeResult = _yield$connection$que35[0];
          mensaje = (mensajeResult === null || mensajeResult === void 0 ? void 0 : mensajeResult.mensaje) || "Respuesta desconocida";
          esError = ["insuficiente", "error", "no existe", "no encontrado"].some(function (texto) {
            return mensaje.toLowerCase().includes(texto);
          });
          if (!esError) {
            _context18.next = 9;
            break;
          }
          return _context18.abrupt("return", (0, _browser.error)(req, res, 400, mensaje));
        case 9:
          return _context18.abrupt("return", (0, _browser.success)(req, res, 200, {
            mensaje: mensaje,
            codigo_producto: codigo_producto,
            cantidad: cantidad
          }, "CONSUMO A LOGÍSTICA EXITOSO"));
        case 10:
          _context18.prev = 10;
          _t18 = _context18["catch"](1);
          console.error("Error ejecutando consumo logística:", _t18);
          return _context18.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al consumir a logística"));
        case 11:
          _context18.prev = 11;
          if (connection) connection.release();
          return _context18.finish(11);
        case 12:
        case "end":
          return _context18.stop();
      }
    }, _callee18, null, [[1, 10, 11, 12]]);
  }));
  return function ejecutarConsumoLogistica(_x37, _x38) {
    return _ref19.apply(this, arguments);
  };
}();
// ============================================================
// CONSUMO TERMINADA COMPLETO (Terminada Proceso 6 → Terminada Completo 25)
// ============================================================

var consultarConsumoTerminadaProceso = exports.consultarConsumoTerminadaProceso = /*#__PURE__*/function () {
  var _ref20 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee19(req, res) {
    var codigo_barras, barcode, _yield$poolBetrost$qu35, _yield$poolBetrost$qu36, rows, catalogo, talla, codigoProducto, _yield$poolBetrost$qu37, _yield$poolBetrost$qu38, productoRows, producto, _t19;
    return _regenerator["default"].wrap(function (_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          codigo_barras = req.query.codigo_barras;
          if (!(!codigo_barras || typeof codigo_barras !== "string" || codigo_barras.trim() === "")) {
            _context19.next = 1;
            break;
          }
          return _context19.abrupt("return", (0, _browser.error)(req, res, 400, "El código de barras es obligatorio"));
        case 1:
          barcode = codigo_barras.trim();
          _context19.prev = 2;
          _context19.next = 3;
          return _mysql["default"].query("\n      SELECT\n        id_catalogo,\n        referencia,\n        sku,\n        codigo_barras\n      FROM catalogo_productos\n      WHERE codigo_barras = ?\n      AND estado = 1\n      LIMIT 1\n      ", [barcode]);
        case 3:
          _yield$poolBetrost$qu35 = _context19.sent;
          _yield$poolBetrost$qu36 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu35, 1);
          rows = _yield$poolBetrost$qu36[0];
          if (rows.length) {
            _context19.next = 4;
            break;
          }
          return _context19.abrupt("return", (0, _browser.error)(req, res, 404, "Código de barras no registrado en el catálogo"));
        case 4:
          catalogo = rows[0];
          talla = barcode.slice(-2);
          codigoProducto = "".concat(catalogo.referencia).concat(talla);
          _context19.next = 5;
          return _mysql["default"].query("\n      SELECT\n        p.id_producto,\n        p.codigo,\n        p.caracteristica,\n        IFNULL(i.cantidad_disponible, 0) AS stock_disponible\n      FROM productos p\n      LEFT JOIN inventario i\n        ON i.id_producto = p.id_producto\n       AND i.id_bodega = ?\n      WHERE p.codigo = ?\n        AND p.estado = 'ACTIVO'\n      LIMIT 1\n      ", [BODEGA_TERMINADA_PROCESO, codigoProducto]);
        case 5:
          _yield$poolBetrost$qu37 = _context19.sent;
          _yield$poolBetrost$qu38 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu37, 1);
          productoRows = _yield$poolBetrost$qu38[0];
          producto = productoRows[0] || null;
          return _context19.abrupt("return", (0, _browser.success)(req, res, 200, {
            codigo_barras: barcode,
            referencia: catalogo.referencia,
            sku: catalogo.sku,
            talla: talla,
            codigo_producto: codigoProducto,
            id_producto: producto ? producto.id_producto : null,
            caracteristica: producto ? producto.caracteristica : "",
            stock_disponible: producto ? producto.stock_disponible : 0,
            bodega_terminada_proceso: BODEGA_TERMINADA_PROCESO,
            bodega_terminada_completo: BODEGA_TERMINADA_COMPLETO
          }));
        case 6:
          _context19.prev = 6;
          _t19 = _context19["catch"](2);
          console.error("Error consultando consumo terminada proceso:", _t19);
          return _context19.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al consultar el producto"));
        case 7:
        case "end":
          return _context19.stop();
      }
    }, _callee19, null, [[2, 6]]);
  }));
  return function consultarConsumoTerminadaProceso(_x39, _x40) {
    return _ref20.apply(this, arguments);
  };
}();
var ejecutarConsumoTerminadaProceso = exports.ejecutarConsumoTerminadaProceso = /*#__PURE__*/function () {
  var _ref21 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee20(req, res) {
    var _codigo_producto4, _observaciones3;
    var _req$body1, codigo_producto, cantidad, observaciones, id_usuario, connection, _yield$connection$que36, _yield$connection$que37, _yield$connection$que38, usuario, _yield$connection$que39, _yield$connection$que40, _yield$connection$que41, producto, _yield$connection$que42, _yield$connection$que43, _yield$connection$que44, mensajeResult, mensaje, esError, _t20;
    return _regenerator["default"].wrap(function (_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          _req$body1 = req.body, codigo_producto = _req$body1.codigo_producto, cantidad = _req$body1.cantidad, observaciones = _req$body1.observaciones;
          codigo_producto = (_codigo_producto4 = codigo_producto) === null || _codigo_producto4 === void 0 ? void 0 : _codigo_producto4.trim();
          cantidad = Number.parseInt(cantidad, 10);
          id_usuario = Number.parseInt(req.user.id_usuario, 10);
          observaciones = ((_observaciones3 = observaciones) === null || _observaciones3 === void 0 ? void 0 : _observaciones3.trim()) || "";
          if (!(!codigo_producto || Number.isNaN(cantidad) || cantidad <= 0)) {
            _context20.next = 1;
            break;
          }
          return _context20.abrupt("return", (0, _browser.error)(req, res, 400, "Código del producto y cantidad son obligatorios"));
        case 1:
          _context20.prev = 1;
          _context20.next = 2;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 2:
          connection = _context20.sent;
          _context20.next = 3;
          return connection.query("SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1", [id_usuario]);
        case 3:
          _yield$connection$que36 = _context20.sent;
          _yield$connection$que37 = (0, _slicedToArray2["default"])(_yield$connection$que36, 1);
          _yield$connection$que38 = (0, _slicedToArray2["default"])(_yield$connection$que37[0], 1);
          usuario = _yield$connection$que38[0];
          if (usuario) {
            _context20.next = 4;
            break;
          }
          return _context20.abrupt("return", (0, _browser.error)(req, res, 404, "Usuario no existe"));
        case 4:
          _context20.next = 5;
          return connection.query("\n      SELECT id_producto\n      FROM productos\n      WHERE codigo = ? AND estado = 'ACTIVO'\n      LIMIT 1\n      ", [codigo_producto]);
        case 5:
          _yield$connection$que39 = _context20.sent;
          _yield$connection$que40 = (0, _slicedToArray2["default"])(_yield$connection$que39, 1);
          _yield$connection$que41 = (0, _slicedToArray2["default"])(_yield$connection$que40[0], 1);
          producto = _yield$connection$que41[0];
          if (producto) {
            _context20.next = 6;
            break;
          }
          return _context20.abrupt("return", (0, _browser.error)(req, res, 404, "Producto no encontrado"));
        case 6:
          _context20.next = 7;
          return connection.query("CALL sp_consumo_terminada_proceso(?, ?, ?, ?, ?, ?, @mensaje);", [BODEGA_TERMINADA_PROCESO, BODEGA_TERMINADA_COMPLETO, codigo_producto, cantidad, id_usuario, observaciones]);
        case 7:
          _context20.next = 8;
          return connection.query("SELECT @mensaje AS mensaje;");
        case 8:
          _yield$connection$que42 = _context20.sent;
          _yield$connection$que43 = (0, _slicedToArray2["default"])(_yield$connection$que42, 1);
          _yield$connection$que44 = (0, _slicedToArray2["default"])(_yield$connection$que43[0], 1);
          mensajeResult = _yield$connection$que44[0];
          mensaje = (mensajeResult === null || mensajeResult === void 0 ? void 0 : mensajeResult.mensaje) || "Respuesta desconocida";
          esError = ["insuficiente", "error", "no existe", "no encontrado"].some(function (texto) {
            return mensaje.toLowerCase().includes(texto);
          });
          if (!esError) {
            _context20.next = 9;
            break;
          }
          return _context20.abrupt("return", (0, _browser.error)(req, res, 400, mensaje));
        case 9:
          return _context20.abrupt("return", (0, _browser.success)(req, res, 200, {
            mensaje: mensaje,
            codigo_producto: codigo_producto,
            cantidad: cantidad
          }, "CONSUMO A TERMINADA COMPLETO EXITOSO"));
        case 10:
          _context20.prev = 10;
          _t20 = _context20["catch"](1);
          console.error("Error ejecutando consumo terminada proceso:", _t20);
          return _context20.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno del servidor al consumir a Terminada Completo"));
        case 11:
          _context20.prev = 11;
          if (connection) connection.release();
          return _context20.finish(11);
        case 12:
        case "end":
          return _context20.stop();
      }
    }, _callee20, null, [[1, 10, 11, 12]]);
  }));
  return function ejecutarConsumoTerminadaProceso(_x41, _x42) {
    return _ref21.apply(this, arguments);
  };
}();
var activar_catalogo = exports.activar_catalogo = /*#__PURE__*/function () {
  var _ref22 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee21(req, res) {
    var id_catalogo, _yield$poolBetrost$qu39, _yield$poolBetrost$qu40, previo, _yield$poolBetrost$qu41, _yield$poolBetrost$qu42, resultado, _t21;
    return _regenerator["default"].wrap(function (_context21) {
      while (1) switch (_context21.prev = _context21.next) {
        case 0:
          id_catalogo = req.body.id_catalogo;
          if (id_catalogo) {
            _context21.next = 1;
            break;
          }
          return _context21.abrupt("return", res.status(400).json({
            ok: false,
            mensaje: "El id_catalogo es obligatorio"
          }));
        case 1:
          _context21.prev = 1;
          _context21.next = 2;
          return _mysql["default"].query("SELECT estado FROM catalogo_productos WHERE id_catalogo = ?", [id_catalogo]);
        case 2:
          _yield$poolBetrost$qu39 = _context21.sent;
          _yield$poolBetrost$qu40 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu39, 1);
          previo = _yield$poolBetrost$qu40[0];
          _context21.next = 3;
          return _mysql["default"].query("\nUPDATE catalogo_productos\n\nSET estado='ACTIVO'\n\nWHERE id_catalogo=?\n\n", [id_catalogo]);
        case 3:
          _yield$poolBetrost$qu41 = _context21.sent;
          _yield$poolBetrost$qu42 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu41, 1);
          resultado = _yield$poolBetrost$qu42[0];
          if (!previo[0]) {
            _context21.next = 4;
            break;
          }
          _context21.next = 4;
          return (0, _auditoria.registrarAuditoria)(_mysql["default"], req, {
            tabla: "catalogo_productos",
            accion: "CAMBIAR_ESTADO",
            id_registro: id_catalogo,
            datos_antes: (0, _auditoria.recortarFila)(previo[0], ["estado"]),
            datos_despues: {
              estado: "ACTIVO"
            }
          });
        case 4:
          return _context21.abrupt("return", res.json({
            ok: true,
            mensaje: "Producto activado"
          }));
        case 5:
          _context21.prev = 5;
          _t21 = _context21["catch"](1);
          console.error(_t21);
          return _context21.abrupt("return", res.status(500).json({
            ok: false,
            mensaje: "Error activando producto"
          }));
        case 6:
        case "end":
          return _context21.stop();
      }
    }, _callee21, null, [[1, 5]]);
  }));
  return function activar_catalogo(_x43, _x44) {
    return _ref22.apply(this, arguments);
  };
}();