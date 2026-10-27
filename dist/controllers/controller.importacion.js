"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.importar = exports.catalogos = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _mysql = _interopRequireDefault(require("../config/mysql.db"));
var _browser = require("../messages/browser");
var _identidad = require("../utils/identidad");
var _auditoria = require("../utils/auditoria");
var _dotenv = require("dotenv");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; } /* Importación masiva de datos (Fase 5).
 *
 * Permite cargar en bloque:
 *   - productos        -> crear productos nuevos
 *   - saldos           -> fijar el inventario inicial por bodega
 *   - transferencias   -> mover stock entre bodegas
 *   - consumos         -> consumo a Logística o a Terminada Completo
 *
 * Diseño de validación (todo o nada):
 *   1. Se validan TODAS las filas antes de tocar la base.
 *   2. Si hay una sola fila inválida, NO se aplica nada y se devuelven
 *      todos los errores con fila, columna, tipo y mensaje, para que el
 *      usuario corrija el archivo y lo vuelva a subir.
 *   3. Solo con `confirmar: true` y sin errores se ejecuta la carga.
 *
 * La carga se ejecuta en UNA sola transacción (BEGIN ... COMMIT). Si
 * cualquier fila falla durante la aplicación, se hace ROLLBACK completo:
 * nunca queda una carga parcial.
 */
(0, _dotenv.config)();

// Bodegas fijas de negocio (mismos valores que controller.producto.js).
var BODEGA_TERMINADA_COMPLETO = 25;
var BODEGA_LOGISTICA = 27;
var BODEGA_TERMINADA_PROCESO = 6;
var TIPOS_TRANSFERENCIA = ["ENTRADA", "PROCESO", "COMPLETO"];

// Mismos orígenes/destinos y tipo de movimiento que los procedimientos
// sp_consumo_logistica (Terminada Completo -> Logística, 'ENTRADA') y
// sp_consumo_terminada_proceso (Terminada Proceso -> Terminada Completo,
// 'COMPLETO') para que la importación deje el mismo rastro en movimientos.
var DESTINOS_CONSUMO = {
  logistica: {
    origen: BODEGA_TERMINADA_COMPLETO,
    destino: BODEGA_LOGISTICA,
    etiqueta: "Logística",
    tipo_movimiento: "ENTRADA"
  },
  terminada: {
    origen: BODEGA_TERMINADA_PROCESO,
    destino: BODEGA_TERMINADA_COMPLETO,
    etiqueta: "Terminada Completo",
    tipo_movimiento: "COMPLETO"
  }
};

// Prefijos por bodega para armar el "código inteligente" (mismos valores que
// controller.producto.js). El código inteligente = prefijo + código base y es
// el que se guarda en movimientos.observaciones, igual que en el flujo normal.
var PREFIJOS_BODEGA = {
  1: "PPC",
  2: "PPM",
  3: "PPI",
  4: "PPV",
  5: "PPG",
  6: "",
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
  23: "PPG",
  25: ""
};

// Un prefijo vacío es válido (bodegas 6 y 25: código inteligente sin prefijo).
// Solo se cae a "PPG" cuando la bodega no está definida en el mapa.
var obtenerPrefijoBodega = function obtenerPrefijoBodega(idBodega) {
  var clave = Number(idBodega);
  return Object.prototype.hasOwnProperty.call(PREFIJOS_BODEGA, clave) ? PREFIJOS_BODEGA[clave] : "PPG";
};

// Arma "prefijo + código" y lo antepone a las observaciones del usuario,
// replicando construirObservacionFinal del flujo normal de transferencias.
var construirObservacionFinal = function construirObservacionFinal(_ref) {
  var observaciones = _ref.observaciones,
    idBodega = _ref.idBodega,
    codigo = _ref.codigo;
  var prefijo = obtenerPrefijoBodega(idBodega);
  return "".concat(observaciones || "", " ").concat(prefijo).concat(codigo).trim();
};

// Columnas esperadas por cada tipo de importación. Se usa tanto para la
// plantilla que descarga el usuario como para validar que no falten datos.
var DEFINICIONES = {
  productos: {
    etiqueta: "Productos",
    columnas: [{
      nombre: "codigo",
      requerida: true,
      ayuda: "Código único del producto (máx. 50)."
    }, {
      nombre: "caracteristica",
      requerida: false,
      ayuda: "Característica (opcional, máx. 200)."
    }]
  },
  saldos: {
    etiqueta: "Saldos iniciales",
    columnas: [{
      nombre: "codigo",
      requerida: true,
      ayuda: "Código de un producto ya existente."
    }, {
      nombre: "bodega",
      requerida: true,
      ayuda: "Nombre o ID de la bodega."
    }, {
      nombre: "cantidad",
      requerida: true,
      ayuda: "Cantidad final (entero >= 0)."
    }, {
      nombre: "motivo",
      requerida: false,
      ayuda: "Motivo (opcional). Por defecto: Carga inicial."
    }]
  },
  transferencias: {
    etiqueta: "Transferencias",
    columnas: [{
      nombre: "codigo",
      requerida: true,
      ayuda: "Código de un producto existente."
    }, {
      nombre: "bodega_origen",
      requerida: true,
      ayuda: "Bodega de salida (nombre o ID)."
    }, {
      nombre: "bodega_destino",
      requerida: true,
      ayuda: "Bodega de entrada (nombre o ID)."
    }, {
      nombre: "cantidad",
      requerida: true,
      ayuda: "Cantidad a mover (entero > 0)."
    }, {
      nombre: "tipo_movimiento",
      requerida: true,
      ayuda: "ENTRADA, PROCESO o COMPLETO."
    }, {
      nombre: "observaciones",
      requerida: false,
      ayuda: "Observaciones (opcional)."
    }]
  },
  consumos: {
    etiqueta: "Consumos",
    columnas: [{
      nombre: "codigo",
      requerida: true,
      ayuda: "Código de un producto existente."
    }, {
      nombre: "destino",
      requerida: true,
      ayuda: "logistica o terminada."
    }, {
      nombre: "cantidad",
      requerida: true,
      ayuda: "Cantidad a consumir (entero > 0)."
    }, {
      nombre: "observaciones",
      requerida: false,
      ayuda: "Observaciones (opcional)."
    }]
  }
};

// ---------------------------------------------------------------------------
// Utilidades de normalización
// ---------------------------------------------------------------------------

function normTexto(valor) {
  return String(valor !== null && valor !== void 0 ? valor : "").trim().replace(/\s+/g, " ");
}
function normClave(valor) {
  return normTexto(valor).toUpperCase();
}
function normMinuscula(valor) {
  return normTexto(valor).toLowerCase();
}

// Acepta enteros con signo. Rechaza decimales, texto y vacíos.
function aEntero(valor) {
  if (valor === null || valor === undefined) return NaN;
  var texto = String(valor).trim();
  if (!/^-?\d+$/.test(texto)) return NaN;
  return parseInt(texto, 10);
}
function filaDe(row, indice) {
  return Number.isInteger(row === null || row === void 0 ? void 0 : row._fila) ? row._fila : indice + 2;
}
function errorFila(errores, fila, columna, tipo, mensaje) {
  errores.push({
    fila: fila,
    columna: columna,
    tipo: tipo,
    mensaje: mensaje
  });
}

// ---------------------------------------------------------------------------
// Contexto de base (catálogos para validar)
// ---------------------------------------------------------------------------
function cargarContexto() {
  return _cargarContexto.apply(this, arguments);
} // Resuelve una bodega por ID o por nombre (insensible a mayúsculas).
function _cargarContexto() {
  _cargarContexto = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3() {
    var _yield$poolBetrost$qu3, _yield$poolBetrost$qu4, bodegas, _yield$poolBetrost$qu5, _yield$poolBetrost$qu6, productos, _yield$poolBetrost$qu7, _yield$poolBetrost$qu8, inventario, bodegasPorNombre, bodegasPorId, _iterator, _step, b, productosPorClave, _iterator2, _step2, p, stock, _iterator3, _step3, inv;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 1;
          return _mysql["default"].query("SELECT id_bodega, nombre, estado FROM bodegas");
        case 1:
          _yield$poolBetrost$qu3 = _context3.sent;
          _yield$poolBetrost$qu4 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu3, 1);
          bodegas = _yield$poolBetrost$qu4[0];
          _context3.next = 2;
          return _mysql["default"].query("SELECT id_producto, codigo, estado FROM productos");
        case 2:
          _yield$poolBetrost$qu5 = _context3.sent;
          _yield$poolBetrost$qu6 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu5, 1);
          productos = _yield$poolBetrost$qu6[0];
          _context3.next = 3;
          return _mysql["default"].query("SELECT id_producto, id_bodega, cantidad_disponible FROM inventario");
        case 3:
          _yield$poolBetrost$qu7 = _context3.sent;
          _yield$poolBetrost$qu8 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu7, 1);
          inventario = _yield$poolBetrost$qu8[0];
          bodegasPorNombre = new Map();
          bodegasPorId = new Map();
          _iterator = _createForOfIteratorHelper(bodegas);
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              b = _step.value;
              bodegasPorNombre.set(normClave(b.nombre), b);
              bodegasPorId.set(String(b.id_bodega), b);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          productosPorClave = new Map();
          _iterator2 = _createForOfIteratorHelper(productos);
          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              p = _step2.value;
              productosPorClave.set(normClave(p.codigo), p);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
          stock = new Map();
          _iterator3 = _createForOfIteratorHelper(inventario);
          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              inv = _step3.value;
              stock.set("".concat(inv.id_producto, ":").concat(inv.id_bodega), Number(inv.cantidad_disponible) || 0);
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
          return _context3.abrupt("return", {
            bodegasPorNombre: bodegasPorNombre,
            bodegasPorId: bodegasPorId,
            productosPorClave: productosPorClave,
            stock: stock
          });
        case 4:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _cargarContexto.apply(this, arguments);
}
function resolverBodega(ctx, valor) {
  var texto = normTexto(valor);
  if (!texto) return {
    error: "requerida"
  };
  var porId = ctx.bodegasPorId.get(texto);
  if (porId) return {
    bodega: porId
  };
  var porNombre = ctx.bodegasPorNombre.get(normClave(texto));
  if (porNombre) return {
    bodega: porNombre
  };
  return {
    error: "no_encontrada"
  };
}

// Resuelve un producto que debe estar ACTIVO.
function resolverProductoActivo(ctx, valor) {
  var texto = normTexto(valor);
  if (!texto) return {
    error: "requerida"
  };
  var p = ctx.productosPorClave.get(normClave(texto));
  if (!p) return {
    error: "no_encontrado"
  };
  if (p.estado !== "ACTIVO") return {
    error: "inactivo"
  };
  return {
    producto: p
  };
}
function leerStock(stock, idProducto, idBodega) {
  return stock.get("".concat(idProducto, ":").concat(idBodega)) || 0;
}
function escribirStock(stock, idProducto, idBodega, valor) {
  stock.set("".concat(idProducto, ":").concat(idBodega), valor);
}

// ---------------------------------------------------------------------------
// Validación por tipo (devuelve { errores, plan })
// ---------------------------------------------------------------------------

function validarProductos(filas, ctx) {
  var errores = [];
  var plan = [];
  var vistos = new Set();
  filas.forEach(function (row, i) {
    var fila = filaDe(row, i);
    var codigo = normTexto(row.codigo);
    var caracteristica = normTexto(row.caracteristica);
    if (!codigo) {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (codigo.length > 50) {
      errorFila(errores, fila, "codigo", "longitud", "El código supera los 50 caracteres.");
    } else if (ctx.productosPorClave.has(normClave(codigo))) {
      errorFila(errores, fila, "codigo", "duplicado_bd", "El c\xF3digo \"".concat(codigo, "\" ya est\xE1 registrado."));
    } else if (vistos.has(normClave(codigo))) {
      errorFila(errores, fila, "codigo", "duplicado_archivo", "El c\xF3digo \"".concat(codigo, "\" se repite en el archivo."));
    } else {
      vistos.add(normClave(codigo));
    }
    if (caracteristica.length > 200) {
      errorFila(errores, fila, "caracteristica", "longitud", "La característica supera los 200 caracteres.");
    }
    plan.push({
      codigo: codigo,
      caracteristica: caracteristica
    });
  });
  return {
    errores: errores,
    plan: plan
  };
}
function validarSaldos(filas, ctx) {
  var errores = [];
  var plan = [];
  var vistos = new Set();
  filas.forEach(function (row, i) {
    var _cod$producto, _bog$bodega, _cod$producto$codigo, _cod$producto2, _bog$bodega$nombre, _bog$bodega2;
    var fila = filaDe(row, i);
    var codigoTexto = normTexto(row.codigo);
    var bodegaTexto = normTexto(row.bodega);
    var cod = resolverProductoActivo(ctx, row.codigo);
    if (cod.error === "requerida") {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (cod.error === "no_encontrado") {
      errorFila(errores, fila, "codigo", "no_encontrado", "El producto \"".concat(codigoTexto, "\" no existe."));
    } else if (cod.error === "inactivo") {
      errorFila(errores, fila, "codigo", "inactivo", "El producto \"".concat(codigoTexto, "\" est\xE1 inactivo."));
    }
    var bog = resolverBodega(ctx, row.bodega);
    if (bog.error === "requerida") {
      errorFila(errores, fila, "bodega", "requerido", "La bodega es obligatoria.");
    } else if (bog.error === "no_encontrada") {
      errorFila(errores, fila, "bodega", "no_encontrada", "La bodega \"".concat(bodegaTexto, "\" no existe."));
    } else if (bog.bodega.estado !== "ACTIVA") {
      errorFila(errores, fila, "bodega", "inactiva", "La bodega \"".concat(bodegaTexto, "\" est\xE1 inactiva."));
    }
    var cantidad = aEntero(row.cantidad);
    if (Number.isNaN(cantidad)) {
      errorFila(errores, fila, "cantidad", "no_numerica", "La cantidad debe ser un número entero.");
    } else if (cantidad < 0) {
      errorFila(errores, fila, "cantidad", "negativa", "La cantidad no puede ser negativa.");
    }
    if (cod.producto && bog.bodega) {
      var clave = "".concat(cod.producto.id_producto, ":").concat(bog.bodega.id_bodega);
      if (vistos.has(clave)) {
        errorFila(errores, fila, "codigo", "duplicado_archivo", "El producto \"".concat(codigoTexto, "\" en la bodega \"").concat(bodegaTexto, "\" se repite en el archivo."));
      } else {
        vistos.add(clave);
      }
    }
    plan.push({
      id_producto: (_cod$producto = cod.producto) === null || _cod$producto === void 0 ? void 0 : _cod$producto.id_producto,
      id_bodega: (_bog$bodega = bog.bodega) === null || _bog$bodega === void 0 ? void 0 : _bog$bodega.id_bodega,
      codigo: (_cod$producto$codigo = (_cod$producto2 = cod.producto) === null || _cod$producto2 === void 0 ? void 0 : _cod$producto2.codigo) !== null && _cod$producto$codigo !== void 0 ? _cod$producto$codigo : codigoTexto,
      bodega: (_bog$bodega$nombre = (_bog$bodega2 = bog.bodega) === null || _bog$bodega2 === void 0 ? void 0 : _bog$bodega2.nombre) !== null && _bog$bodega$nombre !== void 0 ? _bog$bodega$nombre : bodegaTexto,
      cantidad: cantidad,
      motivo: normTexto(row.motivo) || "Carga inicial"
    });
  });
  return {
    errores: errores,
    plan: plan
  };
}
function validarTransferencias(filas, ctx) {
  var errores = [];
  var plan = [];
  // Copia del stock para simular el efecto acumulado de las filas antes de
  // aplicar: así se detecta un stock insuficiente aun cuando varias filas
  // consuman el mismo producto y bodega.
  var stockSim = new Map(ctx.stock);
  filas.forEach(function (row, i) {
    var _cod$producto3, _cod$producto$codigo2, _cod$producto4, _origen$bodega, _destino$bodega, _origen$bodega$nombre, _origen$bodega2, _destino$bodega$nombr, _destino$bodega2;
    var fila = filaDe(row, i);
    var codigoTexto = normTexto(row.codigo);
    var cod = resolverProductoActivo(ctx, row.codigo);
    if (cod.error === "requerida") {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (cod.error === "no_encontrado") {
      errorFila(errores, fila, "codigo", "no_encontrado", "El producto \"".concat(codigoTexto, "\" no existe."));
    } else if (cod.error === "inactivo") {
      errorFila(errores, fila, "codigo", "inactivo", "El producto \"".concat(codigoTexto, "\" est\xE1 inactivo."));
    }
    var origenTexto = normTexto(row.bodega_origen);
    var destinoTexto = normTexto(row.bodega_destino);
    var origen = resolverBodega(ctx, row.bodega_origen);
    var destino = resolverBodega(ctx, row.bodega_destino);
    if (origen.error === "requerida") {
      errorFila(errores, fila, "bodega_origen", "requerido", "La bodega origen es obligatoria.");
    } else if (origen.error === "no_encontrada") {
      errorFila(errores, fila, "bodega_origen", "no_encontrada", "La bodega origen \"".concat(origenTexto, "\" no existe."));
    } else if (origen.bodega.estado !== "ACTIVA") {
      errorFila(errores, fila, "bodega_origen", "inactiva", "La bodega origen \"".concat(origenTexto, "\" est\xE1 inactiva."));
    }
    if (destino.error === "requerida") {
      errorFila(errores, fila, "bodega_destino", "requerido", "La bodega destino es obligatoria.");
    } else if (destino.error === "no_encontrada") {
      errorFila(errores, fila, "bodega_destino", "no_encontrada", "La bodega destino \"".concat(destinoTexto, "\" no existe."));
    } else if (destino.bodega.estado !== "ACTIVA") {
      errorFila(errores, fila, "bodega_destino", "inactiva", "La bodega destino \"".concat(destinoTexto, "\" est\xE1 inactiva."));
    }
    if (origen.bodega && destino.bodega && origen.bodega.id_bodega === destino.bodega.id_bodega) {
      errorFila(errores, fila, "bodega_destino", "igual_origen", "La bodega origen y destino no pueden ser iguales.");
    }
    var cantidad = aEntero(row.cantidad);
    if (Number.isNaN(cantidad)) {
      errorFila(errores, fila, "cantidad", "no_numerica", "La cantidad debe ser un número entero.");
    } else if (cantidad <= 0) {
      errorFila(errores, fila, "cantidad", "mayor_cero", "La cantidad debe ser mayor a 0.");
    }
    var tipoMovimiento = normClave(row.tipo_movimiento);
    if (!TIPOS_TRANSFERENCIA.includes(tipoMovimiento)) {
      errorFila(errores, fila, "tipo_movimiento", "invalido", "Tipo de movimiento inv\xE1lido. Use: ".concat(TIPOS_TRANSFERENCIA.join(", "), "."));
    }
    if (cod.producto && origen.bodega && destino.bodega && !Number.isNaN(cantidad) && cantidad > 0) {
      var disponible = leerStock(stockSim, cod.producto.id_producto, origen.bodega.id_bodega);
      if (disponible < cantidad) {
        errorFila(errores, fila, "cantidad", "stock_insuficiente", "Stock insuficiente en la bodega origen. Disponible: ".concat(disponible, ", solicitado: ").concat(cantidad, "."));
      } else {
        escribirStock(stockSim, cod.producto.id_producto, origen.bodega.id_bodega, disponible - cantidad);
        var actualDestino = leerStock(stockSim, cod.producto.id_producto, destino.bodega.id_bodega);
        escribirStock(stockSim, cod.producto.id_producto, destino.bodega.id_bodega, actualDestino + cantidad);
      }
    }
    plan.push({
      id_producto: (_cod$producto3 = cod.producto) === null || _cod$producto3 === void 0 ? void 0 : _cod$producto3.id_producto,
      codigo: (_cod$producto$codigo2 = (_cod$producto4 = cod.producto) === null || _cod$producto4 === void 0 ? void 0 : _cod$producto4.codigo) !== null && _cod$producto$codigo2 !== void 0 ? _cod$producto$codigo2 : codigoTexto,
      id_bodega_origen: (_origen$bodega = origen.bodega) === null || _origen$bodega === void 0 ? void 0 : _origen$bodega.id_bodega,
      id_bodega_destino: (_destino$bodega = destino.bodega) === null || _destino$bodega === void 0 ? void 0 : _destino$bodega.id_bodega,
      origen: (_origen$bodega$nombre = (_origen$bodega2 = origen.bodega) === null || _origen$bodega2 === void 0 ? void 0 : _origen$bodega2.nombre) !== null && _origen$bodega$nombre !== void 0 ? _origen$bodega$nombre : origenTexto,
      destino: (_destino$bodega$nombr = (_destino$bodega2 = destino.bodega) === null || _destino$bodega2 === void 0 ? void 0 : _destino$bodega2.nombre) !== null && _destino$bodega$nombr !== void 0 ? _destino$bodega$nombr : destinoTexto,
      cantidad: cantidad,
      tipo_movimiento: tipoMovimiento,
      observaciones: normTexto(row.observaciones)
    });
  });
  return {
    errores: errores,
    plan: plan
  };
}
function validarConsumos(filas, ctx) {
  var errores = [];
  var plan = [];
  var stockSim = new Map(ctx.stock);
  filas.forEach(function (row, i) {
    var _cod$producto5, _cod$producto$codigo3, _cod$producto6;
    var fila = filaDe(row, i);
    var codigoTexto = normTexto(row.codigo);
    var cod = resolverProductoActivo(ctx, row.codigo);
    if (cod.error === "requerida") {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (cod.error === "no_encontrado") {
      errorFila(errores, fila, "codigo", "no_encontrado", "El producto \"".concat(codigoTexto, "\" no existe."));
    } else if (cod.error === "inactivo") {
      errorFila(errores, fila, "codigo", "inactivo", "El producto \"".concat(codigoTexto, "\" est\xE1 inactivo."));
    }
    var destinoClave = normMinuscula(row.destino);
    var destino = DESTINOS_CONSUMO[destinoClave];
    if (!destino) {
      errorFila(errores, fila, "destino", "invalido", 'El destino debe ser "logistica" o "terminada".');
    }
    var cantidad = aEntero(row.cantidad);
    if (Number.isNaN(cantidad)) {
      errorFila(errores, fila, "cantidad", "no_numerica", "La cantidad debe ser un número entero.");
    } else if (cantidad <= 0) {
      errorFila(errores, fila, "cantidad", "mayor_cero", "La cantidad debe ser mayor a 0.");
    }
    if (cod.producto && destino && !Number.isNaN(cantidad) && cantidad > 0) {
      var disponible = leerStock(stockSim, cod.producto.id_producto, destino.origen);
      if (disponible < cantidad) {
        errorFila(errores, fila, "cantidad", "stock_insuficiente", "Stock insuficiente en ".concat(destino.etiqueta, ". Disponible: ").concat(disponible, ", solicitado: ").concat(cantidad, "."));
      } else {
        escribirStock(stockSim, cod.producto.id_producto, destino.origen, disponible - cantidad);
      }
    }
    plan.push({
      id_producto: (_cod$producto5 = cod.producto) === null || _cod$producto5 === void 0 ? void 0 : _cod$producto5.id_producto,
      codigo: (_cod$producto$codigo3 = (_cod$producto6 = cod.producto) === null || _cod$producto6 === void 0 ? void 0 : _cod$producto6.codigo) !== null && _cod$producto$codigo3 !== void 0 ? _cod$producto$codigo3 : codigoTexto,
      destino: destinoClave,
      cantidad: cantidad,
      observaciones: normTexto(row.observaciones)
    });
  });
  return {
    errores: errores,
    plan: plan
  };
}
var VALIDADORES = {
  productos: validarProductos,
  saldos: validarSaldos,
  transferencias: validarTransferencias,
  consumos: validarConsumos
};

// ---------------------------------------------------------------------------
// Aplicación (una sola transacción -> todo o nada)
// ---------------------------------------------------------------------------
function aplicar(_x, _x2, _x3) {
  return _aplicar.apply(this, arguments);
} // ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
/**
 * GET /import/catalogos
 * Devuelve bodegas, destinos de consumo y la definición de columnas por tipo
 * para que el frontend pueda armar las plantillas y el selector.
 */
function _aplicar() {
  _aplicar = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(tipo, plan, req) {
    var _req$user;
    var connection, idUsuario, resultados, _iterator4, _step4, op, _yield$connection$que, _yield$connection$que2, r, _iterator5, _step5, _anterior$cantidad_di, _op, _yield$connection$que3, _yield$connection$que4, _yield$connection$que5, anterior, cantidadAnterior, _iterator6, _step6, _op2, _yield$connection$que6, _yield$connection$que7, _r, _iterator7, _step7, _op3, destino, _yield$connection$que8, _yield$connection$que9, _r2, _t3, _t4, _t5, _t6, _t7;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 1;
          return (0, _identidad.conIdentidad)(_mysql["default"], req);
        case 1:
          connection = _context4.sent;
          idUsuario = Number.isInteger((_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.id_usuario) ? req.user.id_usuario : null;
          resultados = [];
          _context4.prev = 2;
          _context4.next = 3;
          return connection.beginTransaction();
        case 3:
          if (!(tipo === "productos")) {
            _context4.next = 12;
            break;
          }
          _iterator4 = _createForOfIteratorHelper(plan);
          _context4.prev = 4;
          _iterator4.s();
        case 5:
          if ((_step4 = _iterator4.n()).done) {
            _context4.next = 8;
            break;
          }
          op = _step4.value;
          _context4.next = 6;
          return connection.query("INSERT INTO productos (codigo, caracteristica, estado, fecha_creacion)\n           VALUES (?, ?, 'ACTIVO', NOW())", [op.codigo, op.caracteristica]);
        case 6:
          _yield$connection$que = _context4.sent;
          _yield$connection$que2 = (0, _slicedToArray2["default"])(_yield$connection$que, 1);
          r = _yield$connection$que2[0];
          resultados.push({
            codigo: op.codigo,
            estado: "creado"
          });
          _context4.next = 7;
          return (0, _auditoria.registrarAuditoria)(connection, req, {
            tabla: "productos",
            accion: "INSERT",
            id_registro: r.insertId,
            datos_despues: {
              codigo: op.codigo,
              caracteristica: op.caracteristica
            }
          });
        case 7:
          _context4.next = 5;
          break;
        case 8:
          _context4.next = 10;
          break;
        case 9:
          _context4.prev = 9;
          _t3 = _context4["catch"](4);
          _iterator4.e(_t3);
        case 10:
          _context4.prev = 10;
          _iterator4.f();
          return _context4.finish(10);
        case 11:
          _context4.next = 46;
          break;
        case 12:
          if (!(tipo === "saldos")) {
            _context4.next = 23;
            break;
          }
          _iterator5 = _createForOfIteratorHelper(plan);
          _context4.prev = 13;
          _iterator5.s();
        case 14:
          if ((_step5 = _iterator5.n()).done) {
            _context4.next = 19;
            break;
          }
          _op = _step5.value;
          _context4.next = 15;
          return connection.query("SELECT cantidad_disponible FROM inventario\n           WHERE id_producto = ? AND id_bodega = ? FOR UPDATE", [_op.id_producto, _op.id_bodega]);
        case 15:
          _yield$connection$que3 = _context4.sent;
          _yield$connection$que4 = (0, _slicedToArray2["default"])(_yield$connection$que3, 1);
          _yield$connection$que5 = (0, _slicedToArray2["default"])(_yield$connection$que4[0], 1);
          anterior = _yield$connection$que5[0];
          cantidadAnterior = (_anterior$cantidad_di = anterior === null || anterior === void 0 ? void 0 : anterior.cantidad_disponible) !== null && _anterior$cantidad_di !== void 0 ? _anterior$cantidad_di : 0;
          _context4.next = 16;
          return connection.query("INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)\n           VALUES (?, ?, ?)\n           ON DUPLICATE KEY UPDATE\n             cantidad_disponible = VALUES(cantidad_disponible),\n             fecha_actualizacion = CURRENT_TIMESTAMP", [_op.id_producto, _op.id_bodega, _op.cantidad]);
        case 16:
          _context4.next = 17;
          return connection.query("INSERT INTO movimientos\n             (id_producto, id_bodega_destino, id_usuario_responsable, tipo_movimiento, cantidad, observaciones)\n           VALUES (?, ?, ?, 'ENTRADA', ?, ?)", [_op.id_producto, _op.id_bodega, idUsuario, _op.cantidad - cantidadAnterior, construirObservacionFinal({
            observaciones: _op.motivo,
            idBodega: _op.id_bodega,
            codigo: _op.codigo
          })]);
        case 17:
          resultados.push({
            codigo: _op.codigo,
            bodega: _op.bodega,
            cantidad: _op.cantidad,
            estado: "ajustado"
          });
          _context4.next = 18;
          return (0, _auditoria.registrarAuditoria)(connection, req, {
            tabla: "inventario",
            accion: "AJUSTE",
            datos_despues: {
              codigo: _op.codigo,
              bodega: _op.bodega,
              cantidad: _op.cantidad
            }
          });
        case 18:
          _context4.next = 14;
          break;
        case 19:
          _context4.next = 21;
          break;
        case 20:
          _context4.prev = 20;
          _t4 = _context4["catch"](13);
          _iterator5.e(_t4);
        case 21:
          _context4.prev = 21;
          _iterator5.f();
          return _context4.finish(21);
        case 22:
          _context4.next = 46;
          break;
        case 23:
          if (!(tipo === "transferencias")) {
            _context4.next = 35;
            break;
          }
          _iterator6 = _createForOfIteratorHelper(plan);
          _context4.prev = 24;
          _iterator6.s();
        case 25:
          if ((_step6 = _iterator6.n()).done) {
            _context4.next = 31;
            break;
          }
          _op2 = _step6.value;
          _context4.next = 26;
          return connection.query("UPDATE inventario\n           SET cantidad_disponible = cantidad_disponible - ?, fecha_actualizacion = CURRENT_TIMESTAMP\n           WHERE id_producto = ? AND id_bodega = ? AND cantidad_disponible >= ?", [_op2.cantidad, _op2.id_producto, _op2.id_bodega_origen, _op2.cantidad]);
        case 26:
          _yield$connection$que6 = _context4.sent;
          _yield$connection$que7 = (0, _slicedToArray2["default"])(_yield$connection$que6, 1);
          _r = _yield$connection$que7[0];
          if (!(_r.affectedRows === 0)) {
            _context4.next = 27;
            break;
          }
          throw new Error("Stock insuficiente para el producto ".concat(_op2.codigo, " en la bodega origen."));
        case 27:
          _context4.next = 28;
          return connection.query("INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)\n           VALUES (?, ?, ?)\n           ON DUPLICATE KEY UPDATE\n             cantidad_disponible = cantidad_disponible + VALUES(cantidad_disponible),\n             fecha_actualizacion = CURRENT_TIMESTAMP", [_op2.id_producto, _op2.id_bodega_destino, _op2.cantidad]);
        case 28:
          _context4.next = 29;
          return connection.query("INSERT INTO movimientos\n             (id_producto, id_bodega_origen, id_bodega_destino, id_usuario_responsable,\n              tipo_movimiento, cantidad, observaciones)\n           VALUES (?, ?, ?, ?, ?, ?, ?)", [_op2.id_producto, _op2.id_bodega_origen, _op2.id_bodega_destino, idUsuario, _op2.tipo_movimiento, _op2.cantidad, construirObservacionFinal({
            observaciones: _op2.observaciones,
            idBodega: _op2.id_bodega_origen,
            codigo: _op2.codigo
          })]);
        case 29:
          resultados.push({
            codigo: _op2.codigo,
            origen: _op2.origen,
            destino: _op2.destino,
            cantidad: _op2.cantidad,
            estado: "transferido"
          });
          _context4.next = 30;
          return (0, _auditoria.registrarAuditoria)(connection, req, {
            tabla: "movimientos",
            accion: "INSERT",
            datos_despues: {
              codigo: _op2.codigo,
              origen: _op2.origen,
              destino: _op2.destino,
              cantidad: _op2.cantidad
            }
          });
        case 30:
          _context4.next = 25;
          break;
        case 31:
          _context4.next = 33;
          break;
        case 32:
          _context4.prev = 32;
          _t5 = _context4["catch"](24);
          _iterator6.e(_t5);
        case 33:
          _context4.prev = 33;
          _iterator6.f();
          return _context4.finish(33);
        case 34:
          _context4.next = 46;
          break;
        case 35:
          if (!(tipo === "consumos")) {
            _context4.next = 46;
            break;
          }
          _iterator7 = _createForOfIteratorHelper(plan);
          _context4.prev = 36;
          _iterator7.s();
        case 37:
          if ((_step7 = _iterator7.n()).done) {
            _context4.next = 43;
            break;
          }
          _op3 = _step7.value;
          destino = DESTINOS_CONSUMO[_op3.destino];
          _context4.next = 38;
          return connection.query("UPDATE inventario\n           SET cantidad_disponible = cantidad_disponible - ?, fecha_actualizacion = CURRENT_TIMESTAMP\n           WHERE id_producto = ? AND id_bodega = ? AND cantidad_disponible >= ?", [_op3.cantidad, _op3.id_producto, destino.origen, _op3.cantidad]);
        case 38:
          _yield$connection$que8 = _context4.sent;
          _yield$connection$que9 = (0, _slicedToArray2["default"])(_yield$connection$que8, 1);
          _r2 = _yield$connection$que9[0];
          if (!(_r2.affectedRows === 0)) {
            _context4.next = 39;
            break;
          }
          throw new Error("Stock insuficiente para el producto ".concat(_op3.codigo, " en ").concat(destino.etiqueta, "."));
        case 39:
          _context4.next = 40;
          return connection.query("INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)\n           VALUES (?, ?, ?)\n           ON DUPLICATE KEY UPDATE\n             cantidad_disponible = cantidad_disponible + VALUES(cantidad_disponible),\n             fecha_actualizacion = CURRENT_TIMESTAMP", [_op3.id_producto, destino.destino, _op3.cantidad]);
        case 40:
          _context4.next = 41;
          return connection.query("INSERT INTO movimientos\n             (id_producto, id_bodega_origen, id_bodega_destino, id_usuario_responsable,\n              tipo_movimiento, cantidad, observaciones)\n           VALUES (?, ?, ?, ?, ?, ?, ?)", [_op3.id_producto, destino.origen, destino.destino, idUsuario, destino.tipo_movimiento, _op3.cantidad, construirObservacionFinal({
            observaciones: _op3.observaciones,
            idBodega: destino.origen,
            codigo: _op3.codigo
          })]);
        case 41:
          resultados.push({
            codigo: _op3.codigo,
            destino: destino.etiqueta,
            cantidad: _op3.cantidad,
            estado: "consumido"
          });
          _context4.next = 42;
          return (0, _auditoria.registrarAuditoria)(connection, req, {
            tabla: "movimientos",
            accion: "INSERT",
            datos_despues: {
              codigo: _op3.codigo,
              destino: destino.etiqueta,
              cantidad: _op3.cantidad
            }
          });
        case 42:
          _context4.next = 37;
          break;
        case 43:
          _context4.next = 45;
          break;
        case 44:
          _context4.prev = 44;
          _t6 = _context4["catch"](36);
          _iterator7.e(_t6);
        case 45:
          _context4.prev = 45;
          _iterator7.f();
          return _context4.finish(45);
        case 46:
          _context4.next = 47;
          return connection.commit();
        case 47:
          return _context4.abrupt("return", {
            aplicado: true,
            total: plan.length,
            resultados: resultados
          });
        case 48:
          _context4.prev = 48;
          _t7 = _context4["catch"](2);
          _context4.next = 49;
          return connection.rollback()["catch"](function () {});
        case 49:
          throw _t7;
        case 50:
          _context4.prev = 50;
          connection.release();
          return _context4.finish(50);
        case 51:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[2, 48, 50, 51], [4, 9, 10, 11], [13, 20, 21, 22], [24, 32, 33, 34], [36, 44, 45, 46]]);
  }));
  return _aplicar.apply(this, arguments);
}
var catalogos = exports.catalogos = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _yield$poolBetrost$qu, _yield$poolBetrost$qu2, bodegas, columnas, _i, _Object$entries, _Object$entries$_i, tipo, def, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 1;
          return _mysql["default"].query("SELECT id_bodega, nombre, estado FROM bodegas ORDER BY nombre");
        case 1:
          _yield$poolBetrost$qu = _context.sent;
          _yield$poolBetrost$qu2 = (0, _slicedToArray2["default"])(_yield$poolBetrost$qu, 1);
          bodegas = _yield$poolBetrost$qu2[0];
          columnas = {};
          for (_i = 0, _Object$entries = Object.entries(DEFINICIONES); _i < _Object$entries.length; _i++) {
            _Object$entries$_i = (0, _slicedToArray2["default"])(_Object$entries[_i], 2), tipo = _Object$entries$_i[0], def = _Object$entries$_i[1];
            columnas[tipo] = def.columnas;
          }
          (0, _browser.success)(req, res, 200, {
            bodegas: bodegas.map(function (b) {
              return {
                id_bodega: b.id_bodega,
                nombre: b.nombre,
                estado: b.estado
              };
            }),
            prefijos_bodega: PREFIJOS_BODEGA,
            destinos_consumo: Object.entries(DESTINOS_CONSUMO).map(function (_ref3) {
              var _ref4 = (0, _slicedToArray2["default"])(_ref3, 2),
                valor = _ref4[0],
                v = _ref4[1];
              return {
                valor: valor,
                etiqueta: v.etiqueta
              };
            }),
            tipos_transferencia: TIPOS_TRANSFERENCIA,
            tipos: Object.entries(DEFINICIONES).map(function (_ref5) {
              var _ref6 = (0, _slicedToArray2["default"])(_ref5, 2),
                valor = _ref6[0],
                def = _ref6[1];
              return {
                valor: valor,
                etiqueta: def.etiqueta
              };
            }),
            columnas: columnas
          });
          _context.next = 3;
          break;
        case 2:
          _context.prev = 2;
          _t = _context["catch"](0);
          console.error("Error al cargar catálogos de importación:", _t);
          (0, _browser.error)(req, res, 500, "No se pudo cargar el catálogo de importación.");
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 2]]);
  }));
  return function catalogos(_x4, _x5) {
    return _ref2.apply(this, arguments);
  };
}();

/**
 * POST /import/importar
 * Body: { tipo, filas, confirmar }
 *   - confirmar: false -> solo valida y devuelve errores (previsualización).
 *   - confirmar: true  -> valida y, si no hay errores, aplica la carga.
 */
var importar = exports.importar = /*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _ref8, tipo, filas, confirmar, ctx, _VALIDADORES$tipo, errores, plan, filasConError, resumen, resultado, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _ref8 = req.body || {}, tipo = _ref8.tipo, filas = _ref8.filas, confirmar = _ref8.confirmar;
          if (DEFINICIONES[tipo]) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", (0, _browser.error)(req, res, 400, "Tipo de importaci\xF3n inv\xE1lido. Use: ".concat(Object.keys(DEFINICIONES).join(", "), ".")));
        case 1:
          if (!(!Array.isArray(filas) || filas.length === 0)) {
            _context2.next = 2;
            break;
          }
          return _context2.abrupt("return", (0, _browser.error)(req, res, 400, "Debe enviar al menos una fila."));
        case 2:
          if (!(filas.length > 2000)) {
            _context2.next = 3;
            break;
          }
          return _context2.abrupt("return", (0, _browser.error)(req, res, 400, "Máximo 2000 filas por importación."));
        case 3:
          _context2.prev = 3;
          _context2.next = 4;
          return cargarContexto();
        case 4:
          ctx = _context2.sent;
          _VALIDADORES$tipo = VALIDADORES[tipo](filas, ctx), errores = _VALIDADORES$tipo.errores, plan = _VALIDADORES$tipo.plan; // `validas` = filas sin ningún error (una fila puede tener varios errores).
          filasConError = new Set(errores.map(function (e) {
            return e.fila;
          }));
          resumen = {
            total: filas.length,
            validas: filas.length - filasConError.size,
            errores: errores.length
          }; // Hay errores: no se aplica nada, se devuelven todos para corregir.
          if (!(errores.length > 0)) {
            _context2.next = 5;
            break;
          }
          return _context2.abrupt("return", (0, _browser.success)(req, res, 200, {
            valido: false,
            aplicado: false,
            errores: errores,
            resumen: resumen
          }));
        case 5:
          if (confirmar) {
            _context2.next = 6;
            break;
          }
          return _context2.abrupt("return", (0, _browser.success)(req, res, 200, {
            valido: true,
            aplicado: false,
            errores: [],
            resumen: resumen
          }));
        case 6:
          _context2.next = 7;
          return aplicar(tipo, plan, req);
        case 7:
          resultado = _context2.sent;
          return _context2.abrupt("return", (0, _browser.success)(req, res, 200, _objectSpread(_objectSpread({
            valido: true
          }, resultado), {}, {
            resumen: resumen
          })));
        case 8:
          _context2.prev = 8;
          _t2 = _context2["catch"](3);
          console.error("Error en importación:", _t2);
          return _context2.abrupt("return", (0, _browser.error)(req, res, 500, "Error interno al procesar la importaci\xF3n: ".concat(_t2.message)));
        case 9:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[3, 8]]);
  }));
  return function importar(_x6, _x7) {
    return _ref7.apply(this, arguments);
  };
}();