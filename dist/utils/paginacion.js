"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PAGINA_POR_DEFECTO = exports.LIMITE_POR_DEFECTO = exports.LIMITE_MAXIMO = void 0;
exports.contarFilas = contarFilas;
exports.enviarTotalCount = enviarTotalCount;
exports.normalizarPaginacion = normalizarPaginacion;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
/* Helpers de paginación para los listados del backend.
 *
 * Se usan placeholders de mysql2 para LIMIT/OFFSET, nunca interpolación
 * de cadenas: aunque el valor venga ya validado como entero, mantener el
 * parámetro enlazado evita que un cambio futuro introduzca inyección.
 *
 * Limitación conocida de MySQL: no se puede aplicar LIMIT/OFFSET sobre
 * un CALL a un procedimiento almacenado. Por eso este helper solo sirve
 * para consultas SELECT directas. Los endpoints basados en CALL
 * (/user/mostrar, /hist/historial, /product/movi) no pueden paginarse
 * sin modificar los procedimientos.
 */

/** Límite superior para que un `limit` abused no traiga la tabla entera. */
var LIMITE_MAXIMO = exports.LIMITE_MAXIMO = 200;

/** Página y límite por defecto cuando el cliente no los envía. */
var PAGINA_POR_DEFECTO = exports.PAGINA_POR_DEFECTO = 1;
var LIMITE_POR_DEFECTO = exports.LIMITE_POR_DEFECTO = 20;

/**
 * Convierte un valor de query en entero, o devuelve `defecto` si no es
 * utilizable. Rechaza NaN, negativos, decimales y valores no numéricos en
 * lugar de propagarlos a la consulta.
 */
function aEnteroSeguro(valor, defecto, minimo, maximo) {
  var numero = Number(valor);
  if (!Number.isFinite(numero)) return defecto;
  var entero = Math.trunc(numero);
  if (entero < minimo) return minimo;
  if (entero > maximo) return maximo;
  return entero;
}

/**
 * Normaliza `page` y `limit` de la query a valores seguros.
 *
 * @param {object} query  req.query
 * @returns {{page: number, limit: number, offset: number}}
 */
function normalizarPaginacion() {
  var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var page = aEnteroSeguro(query.page, PAGINA_POR_DEFECTO, 1, Number.MAX_SAFE_INTEGER);
  var limit = aEnteroSeguro(query.limit, LIMITE_POR_DEFECTO, 1, LIMITE_MAXIMO);
  return {
    page: page,
    limit: limit,
    offset: (page - 1) * limit
  };
}

/**
 * Cuenta las filas de un listado aplicando el mismo filtro que la
 * consulta de datos, para que `X-Total-Count` sea consistente con lo
 * que el cliente ve tras filtrar.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} tabla  Nombre de tabla o vista (identificador interno,
 *                        nunca input del usuario).
 * @param {string} where  Cláusula WHERE sin la palabra clave, ya compuesta
 *                        con placeholders por el llamador.
 * @param {Array}  params  Valores de los placeholders del WHERE.
 * @returns {Promise<number>}
 */
function contarFilas(_x, _x2) {
  return _contarFilas.apply(this, arguments);
}
/**
 * Publica el total de coincidencias en la cabecera `X-Total-Count`.
 * Ya está expuesta en CORS por app.js, así que el frontend la puede leer.
 */
function _contarFilas() {
  _contarFilas = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(pool, tabla) {
    var _rows$0$total, _rows$;
    var where,
      params,
      sql,
      _yield$pool$query,
      _yield$pool$query2,
      rows,
      _args = arguments;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          where = _args.length > 2 && _args[2] !== undefined ? _args[2] : "";
          params = _args.length > 3 && _args[3] !== undefined ? _args[3] : [];
          sql = "SELECT COUNT(*) AS total FROM ".concat(tabla).concat(where ? " WHERE ".concat(where) : "");
          _context.next = 1;
          return pool.query(sql, params);
        case 1:
          _yield$pool$query = _context.sent;
          _yield$pool$query2 = (0, _slicedToArray2["default"])(_yield$pool$query, 1);
          rows = _yield$pool$query2[0];
          return _context.abrupt("return", (_rows$0$total = (_rows$ = rows[0]) === null || _rows$ === void 0 ? void 0 : _rows$.total) !== null && _rows$0$total !== void 0 ? _rows$0$total : 0);
        case 2:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _contarFilas.apply(this, arguments);
}
function enviarTotalCount(res, total) {
  res.set("X-Total-Count", String(total));
}