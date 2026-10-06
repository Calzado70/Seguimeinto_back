"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.conIdentidad = conIdentidad;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
/* Identidad de sesión para los triggers de inventario (Fase 4.3).
 *
 * Los triggers `tr_inventario_historial*` deducen quién movió el stock
 * consultando la tabla `movimientos`. Eso falla en dos situaciones:
 *
 *   1. No hay movimiento previo para ese producto.
 *   2. Los procedimientos almacenados hacen el `UPDATE/INSERT` sobre
 *      `inventario` ANTES de insertar la fila en `movimientos`, así que
 *      cuando corre el trigger el movimiento todavía no existe.
 *
 * Un trigger de MySQL no puede recibir parámetros del SP ni leer el JWT:
 * solo ve el estado de la conexión. La forma estándar de pasarle la
 * identidad es la variable de sesión `@app_user`, que fija la aplicación
 * justo antes del `CALL`.
 *
 * Dos detalles que no son cosméticos:
 *
 *   - Se limpia al devolver la conexión. Un pool reutiliza conexiones, y
 *     un `@app_user` residual atribuiría el movimiento al usuario de una
 *     petición anterior. Eso sería un error de trazabilidad, no un fallo
 *     ruidoso.
 *
 *   - `SET @app_user` jamás lanza. Si la conexión está en mal estado que
 *     falle el resto del controlador, no que reviente al fijar la
 *     identidad: el peor caso es que el trigger no registre, que es el
 *     comportamiento previo.
 */
/**
 * Devuelve una conexión del pool con `@app_user` fijado al usuario de la
 * petición. `release()` queda envuelto para limpiar la variable antes de
 * que la conexión vuelva al pool.
 *
 * Sustituye a `pool.getConnection()` en los controladores que ejecutan
 * SP que tocan `inventario`.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {import('express').Request} req
 * @returns {Promise<import('mysql2/promise').PoolConnection>}
 */
function conIdentidad(_x, _x2) {
  return _conIdentidad.apply(this, arguments);
}
function _conIdentidad() {
  _conIdentidad = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(pool, req) {
    var _req$user;
    var connection, idUsuario, liberar, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 1;
          return pool.getConnection();
        case 1:
          connection = _context.sent;
          idUsuario = Number.isInteger(req === null || req === void 0 || (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.id_usuario) ? req.user.id_usuario : null;
          _context.prev = 2;
          _context.next = 3;
          return connection.query("SET @app_user = ?", [idUsuario]);
        case 3:
          _context.next = 5;
          break;
        case 4:
          _context.prev = 4;
          _t = _context["catch"](2);
          // No se propaga: ver comentario arriba.
          console.error("No se pudo fijar @app_user:", _t.message);
        case 5:
          liberar = connection.release.bind(connection);
          connection.release = function releaseConLimpieza() {
            // Se lanza sin esperar: `release()` se invoca normalmente sin await
            // dentro de los `finally`. Encadenar en vez de devolver una promesa
            // obliga a que la conexión solo vuelva al pool cuando termine el SET.
            connection.query("SET @app_user = NULL")["catch"](function () {})["finally"](function () {
              return liberar();
            });
          };
          return _context.abrupt("return", connection);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[2, 4]]);
  }));
  return _conIdentidad.apply(this, arguments);
}