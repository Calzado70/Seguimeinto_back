/* Importación masiva de datos (Fase 5).
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

import poolBetrost from "../config/mysql.db";
import { success, error } from "../messages/browser";
import { conIdentidad } from "../utils/identidad";
import { registrarAuditoria } from "../utils/auditoria";
import { config } from "dotenv";
config();

// Bodegas fijas de negocio (mismos valores que controller.producto.js).
const BODEGA_TERMINADA_COMPLETO = 25;
const BODEGA_LOGISTICA = 27;
const BODEGA_TERMINADA_PROCESO = 6;

const TIPOS_TRANSFERENCIA = ["ENTRADA", "PROCESO", "COMPLETO"];

// Mismos orígenes/destinos y tipo de movimiento que los procedimientos
// sp_consumo_logistica (Terminada Completo -> Logística, 'ENTRADA') y
// sp_consumo_terminada_proceso (Terminada Proceso -> Terminada Completo,
// 'COMPLETO') para que la importación deje el mismo rastro en movimientos.
const DESTINOS_CONSUMO = {
  logistica: {
    origen: BODEGA_TERMINADA_COMPLETO,
    destino: BODEGA_LOGISTICA,
    etiqueta: "Logística",
    tipo_movimiento: "ENTRADA",
  },
  terminada: {
    origen: BODEGA_TERMINADA_PROCESO,
    destino: BODEGA_TERMINADA_COMPLETO,
    etiqueta: "Terminada Completo",
    tipo_movimiento: "COMPLETO",
  },
};

// Prefijos por bodega para armar el "código inteligente" (mismos valores que
// controller.producto.js). El código inteligente = prefijo + código base y es
// el que se guarda en movimientos.observaciones, igual que en el flujo normal.
const PREFIJOS_BODEGA = {
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
  25: "",
};

// Un prefijo vacío es válido (bodegas 6 y 25: código inteligente sin prefijo).
// Solo se cae a "PPG" cuando la bodega no está definida en el mapa.
const obtenerPrefijoBodega = (idBodega) => {
  const clave = Number(idBodega);
  return Object.prototype.hasOwnProperty.call(PREFIJOS_BODEGA, clave)
    ? PREFIJOS_BODEGA[clave]
    : "PPG";
};

// Arma "prefijo + código" y lo antepone a las observaciones del usuario,
// replicando construirObservacionFinal del flujo normal de transferencias.
const construirObservacionFinal = ({ observaciones, idBodega, codigo }) => {
  const prefijo = obtenerPrefijoBodega(idBodega);
  return `${observaciones || ""} ${prefijo}${codigo}`.trim();
};

// Columnas esperadas por cada tipo de importación. Se usa tanto para la
// plantilla que descarga el usuario como para validar que no falten datos.
const DEFINICIONES = {
  productos: {
    etiqueta: "Productos",
    columnas: [
      { nombre: "codigo", requerida: true, ayuda: "Código único del producto (máx. 50)." },
      { nombre: "caracteristica", requerida: false, ayuda: "Característica (opcional, máx. 200)." },
    ],
  },
  saldos: {
    etiqueta: "Saldos iniciales",
    columnas: [
      { nombre: "codigo", requerida: true, ayuda: "Código de un producto ya existente." },
      { nombre: "bodega", requerida: true, ayuda: "Nombre o ID de la bodega." },
      { nombre: "cantidad", requerida: true, ayuda: "Cantidad final (entero >= 0)." },
      { nombre: "motivo", requerida: false, ayuda: "Motivo (opcional). Por defecto: Carga inicial." },
    ],
  },
  transferencias: {
    etiqueta: "Transferencias",
    columnas: [
      { nombre: "codigo", requerida: true, ayuda: "Código de un producto existente." },
      { nombre: "bodega_origen", requerida: true, ayuda: "Bodega de salida (nombre o ID)." },
      { nombre: "bodega_destino", requerida: true, ayuda: "Bodega de entrada (nombre o ID)." },
      { nombre: "cantidad", requerida: true, ayuda: "Cantidad a mover (entero > 0)." },
      { nombre: "tipo_movimiento", requerida: true, ayuda: "ENTRADA, PROCESO o COMPLETO." },
      { nombre: "observaciones", requerida: false, ayuda: "Observaciones (opcional)." },
    ],
  },
  consumos: {
    etiqueta: "Consumos",
    columnas: [
      { nombre: "codigo", requerida: true, ayuda: "Código de un producto existente." },
      { nombre: "destino", requerida: true, ayuda: "logistica o terminada." },
      { nombre: "cantidad", requerida: true, ayuda: "Cantidad a consumir (entero > 0)." },
      { nombre: "observaciones", requerida: false, ayuda: "Observaciones (opcional)." },
    ],
  },
};

// ---------------------------------------------------------------------------
// Utilidades de normalización
// ---------------------------------------------------------------------------

function normTexto(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
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
  const texto = String(valor).trim();
  if (!/^-?\d+$/.test(texto)) return NaN;
  return parseInt(texto, 10);
}

function filaDe(row, indice) {
  return Number.isInteger(row?._fila) ? row._fila : indice + 2;
}

function errorFila(errores, fila, columna, tipo, mensaje) {
  errores.push({ fila, columna, tipo, mensaje });
}

// ---------------------------------------------------------------------------
// Contexto de base (catálogos para validar)
// ---------------------------------------------------------------------------

async function cargarContexto() {
  const [bodegas] = await poolBetrost.query(
    "SELECT id_bodega, nombre, estado FROM bodegas",
  );
  const [productos] = await poolBetrost.query(
    "SELECT id_producto, codigo, estado FROM productos",
  );
  const [inventario] = await poolBetrost.query(
    "SELECT id_producto, id_bodega, cantidad_disponible FROM inventario",
  );

  const bodegasPorNombre = new Map();
  const bodegasPorId = new Map();
  for (const b of bodegas) {
    bodegasPorNombre.set(normClave(b.nombre), b);
    bodegasPorId.set(String(b.id_bodega), b);
  }

  const productosPorClave = new Map();
  for (const p of productos) {
    productosPorClave.set(normClave(p.codigo), p);
  }

  const stock = new Map();
  for (const inv of inventario) {
    stock.set(
      `${inv.id_producto}:${inv.id_bodega}`,
      Number(inv.cantidad_disponible) || 0,
    );
  }

  return { bodegasPorNombre, bodegasPorId, productosPorClave, stock };
}

// Resuelve una bodega por ID o por nombre (insensible a mayúsculas).
function resolverBodega(ctx, valor) {
  const texto = normTexto(valor);
  if (!texto) return { error: "requerida" };

  const porId = ctx.bodegasPorId.get(texto);
  if (porId) return { bodega: porId };

  const porNombre = ctx.bodegasPorNombre.get(normClave(texto));
  if (porNombre) return { bodega: porNombre };

  return { error: "no_encontrada" };
}

// Resuelve un producto que debe estar ACTIVO.
function resolverProductoActivo(ctx, valor) {
  const texto = normTexto(valor);
  if (!texto) return { error: "requerida" };

  const p = ctx.productosPorClave.get(normClave(texto));
  if (!p) return { error: "no_encontrado" };
  if (p.estado !== "ACTIVO") return { error: "inactivo" };
  return { producto: p };
}

function leerStock(stock, idProducto, idBodega) {
  return stock.get(`${idProducto}:${idBodega}`) || 0;
}

function escribirStock(stock, idProducto, idBodega, valor) {
  stock.set(`${idProducto}:${idBodega}`, valor);
}

// ---------------------------------------------------------------------------
// Validación por tipo (devuelve { errores, plan })
// ---------------------------------------------------------------------------

function validarProductos(filas, ctx) {
  const errores = [];
  const plan = [];
  const vistos = new Set();

  filas.forEach((row, i) => {
    const fila = filaDe(row, i);
    const codigo = normTexto(row.codigo);
    const caracteristica = normTexto(row.caracteristica);

    if (!codigo) {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (codigo.length > 50) {
      errorFila(errores, fila, "codigo", "longitud", "El código supera los 50 caracteres.");
    } else if (ctx.productosPorClave.has(normClave(codigo))) {
      errorFila(errores, fila, "codigo", "duplicado_bd", `El código "${codigo}" ya está registrado.`);
    } else if (vistos.has(normClave(codigo))) {
      errorFila(errores, fila, "codigo", "duplicado_archivo", `El código "${codigo}" se repite en el archivo.`);
    } else {
      vistos.add(normClave(codigo));
    }

    if (caracteristica.length > 200) {
      errorFila(errores, fila, "caracteristica", "longitud", "La característica supera los 200 caracteres.");
    }

    plan.push({ codigo, caracteristica });
  });

  return { errores, plan };
}

function validarSaldos(filas, ctx) {
  const errores = [];
  const plan = [];
  const vistos = new Set();

  filas.forEach((row, i) => {
    const fila = filaDe(row, i);
    const codigoTexto = normTexto(row.codigo);
    const bodegaTexto = normTexto(row.bodega);

    const cod = resolverProductoActivo(ctx, row.codigo);
    if (cod.error === "requerida") {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (cod.error === "no_encontrado") {
      errorFila(errores, fila, "codigo", "no_encontrado", `El producto "${codigoTexto}" no existe.`);
    } else if (cod.error === "inactivo") {
      errorFila(errores, fila, "codigo", "inactivo", `El producto "${codigoTexto}" está inactivo.`);
    }

    const bog = resolverBodega(ctx, row.bodega);
    if (bog.error === "requerida") {
      errorFila(errores, fila, "bodega", "requerido", "La bodega es obligatoria.");
    } else if (bog.error === "no_encontrada") {
      errorFila(errores, fila, "bodega", "no_encontrada", `La bodega "${bodegaTexto}" no existe.`);
    } else if (bog.bodega.estado !== "ACTIVA") {
      errorFila(errores, fila, "bodega", "inactiva", `La bodega "${bodegaTexto}" está inactiva.`);
    }

    const cantidad = aEntero(row.cantidad);
    if (Number.isNaN(cantidad)) {
      errorFila(errores, fila, "cantidad", "no_numerica", "La cantidad debe ser un número entero.");
    } else if (cantidad < 0) {
      errorFila(errores, fila, "cantidad", "negativa", "La cantidad no puede ser negativa.");
    }

    if (cod.producto && bog.bodega) {
      const clave = `${cod.producto.id_producto}:${bog.bodega.id_bodega}`;
      if (vistos.has(clave)) {
        errorFila(errores, fila, "codigo", "duplicado_archivo",
          `El producto "${codigoTexto}" en la bodega "${bodegaTexto}" se repite en el archivo.`);
      } else {
        vistos.add(clave);
      }
    }

    plan.push({
      id_producto: cod.producto?.id_producto,
      id_bodega: bog.bodega?.id_bodega,
      codigo: cod.producto?.codigo ?? codigoTexto,
      bodega: bog.bodega?.nombre ?? bodegaTexto,
      cantidad,
      motivo: normTexto(row.motivo) || "Carga inicial",
    });
  });

  return { errores, plan };
}

function validarTransferencias(filas, ctx) {
  const errores = [];
  const plan = [];
  // Copia del stock para simular el efecto acumulado de las filas antes de
  // aplicar: así se detecta un stock insuficiente aun cuando varias filas
  // consuman el mismo producto y bodega.
  const stockSim = new Map(ctx.stock);

  filas.forEach((row, i) => {
    const fila = filaDe(row, i);
    const codigoTexto = normTexto(row.codigo);

    const cod = resolverProductoActivo(ctx, row.codigo);
    if (cod.error === "requerida") {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (cod.error === "no_encontrado") {
      errorFila(errores, fila, "codigo", "no_encontrado", `El producto "${codigoTexto}" no existe.`);
    } else if (cod.error === "inactivo") {
      errorFila(errores, fila, "codigo", "inactivo", `El producto "${codigoTexto}" está inactivo.`);
    }

    const origenTexto = normTexto(row.bodega_origen);
    const destinoTexto = normTexto(row.bodega_destino);
    const origen = resolverBodega(ctx, row.bodega_origen);
    const destino = resolverBodega(ctx, row.bodega_destino);

    if (origen.error === "requerida") {
      errorFila(errores, fila, "bodega_origen", "requerido", "La bodega origen es obligatoria.");
    } else if (origen.error === "no_encontrada") {
      errorFila(errores, fila, "bodega_origen", "no_encontrada", `La bodega origen "${origenTexto}" no existe.`);
    } else if (origen.bodega.estado !== "ACTIVA") {
      errorFila(errores, fila, "bodega_origen", "inactiva", `La bodega origen "${origenTexto}" está inactiva.`);
    }

    if (destino.error === "requerida") {
      errorFila(errores, fila, "bodega_destino", "requerido", "La bodega destino es obligatoria.");
    } else if (destino.error === "no_encontrada") {
      errorFila(errores, fila, "bodega_destino", "no_encontrada", `La bodega destino "${destinoTexto}" no existe.`);
    } else if (destino.bodega.estado !== "ACTIVA") {
      errorFila(errores, fila, "bodega_destino", "inactiva", `La bodega destino "${destinoTexto}" está inactiva.`);
    }

    if (origen.bodega && destino.bodega && origen.bodega.id_bodega === destino.bodega.id_bodega) {
      errorFila(errores, fila, "bodega_destino", "igual_origen", "La bodega origen y destino no pueden ser iguales.");
    }

    const cantidad = aEntero(row.cantidad);
    if (Number.isNaN(cantidad)) {
      errorFila(errores, fila, "cantidad", "no_numerica", "La cantidad debe ser un número entero.");
    } else if (cantidad <= 0) {
      errorFila(errores, fila, "cantidad", "mayor_cero", "La cantidad debe ser mayor a 0.");
    }

    const tipoMovimiento = normClave(row.tipo_movimiento);
    if (!TIPOS_TRANSFERENCIA.includes(tipoMovimiento)) {
      errorFila(errores, fila, "tipo_movimiento", "invalido",
        `Tipo de movimiento inválido. Use: ${TIPOS_TRANSFERENCIA.join(", ")}.`);
    }

    if (cod.producto && origen.bodega && destino.bodega && !Number.isNaN(cantidad) && cantidad > 0) {
      const disponible = leerStock(stockSim, cod.producto.id_producto, origen.bodega.id_bodega);
      if (disponible < cantidad) {
        errorFila(errores, fila, "cantidad", "stock_insuficiente",
          `Stock insuficiente en la bodega origen. Disponible: ${disponible}, solicitado: ${cantidad}.`);
      } else {
        escribirStock(stockSim, cod.producto.id_producto, origen.bodega.id_bodega, disponible - cantidad);
        const actualDestino = leerStock(stockSim, cod.producto.id_producto, destino.bodega.id_bodega);
        escribirStock(stockSim, cod.producto.id_producto, destino.bodega.id_bodega, actualDestino + cantidad);
      }
    }

    plan.push({
      id_producto: cod.producto?.id_producto,
      codigo: cod.producto?.codigo ?? codigoTexto,
      id_bodega_origen: origen.bodega?.id_bodega,
      id_bodega_destino: destino.bodega?.id_bodega,
      origen: origen.bodega?.nombre ?? origenTexto,
      destino: destino.bodega?.nombre ?? destinoTexto,
      cantidad,
      tipo_movimiento: tipoMovimiento,
      observaciones: normTexto(row.observaciones),
    });
  });

  return { errores, plan };
}

function validarConsumos(filas, ctx) {
  const errores = [];
  const plan = [];
  const stockSim = new Map(ctx.stock);

  filas.forEach((row, i) => {
    const fila = filaDe(row, i);
    const codigoTexto = normTexto(row.codigo);

    const cod = resolverProductoActivo(ctx, row.codigo);
    if (cod.error === "requerida") {
      errorFila(errores, fila, "codigo", "requerido", "El código es obligatorio.");
    } else if (cod.error === "no_encontrado") {
      errorFila(errores, fila, "codigo", "no_encontrado", `El producto "${codigoTexto}" no existe.`);
    } else if (cod.error === "inactivo") {
      errorFila(errores, fila, "codigo", "inactivo", `El producto "${codigoTexto}" está inactivo.`);
    }

    const destinoClave = normMinuscula(row.destino);
    const destino = DESTINOS_CONSUMO[destinoClave];
    if (!destino) {
      errorFila(errores, fila, "destino", "invalido", 'El destino debe ser "logistica" o "terminada".');
    }

    const cantidad = aEntero(row.cantidad);
    if (Number.isNaN(cantidad)) {
      errorFila(errores, fila, "cantidad", "no_numerica", "La cantidad debe ser un número entero.");
    } else if (cantidad <= 0) {
      errorFila(errores, fila, "cantidad", "mayor_cero", "La cantidad debe ser mayor a 0.");
    }

    if (cod.producto && destino && !Number.isNaN(cantidad) && cantidad > 0) {
      const disponible = leerStock(stockSim, cod.producto.id_producto, destino.origen);
      if (disponible < cantidad) {
        errorFila(errores, fila, "cantidad", "stock_insuficiente",
          `Stock insuficiente en ${destino.etiqueta}. Disponible: ${disponible}, solicitado: ${cantidad}.`);
      } else {
        escribirStock(stockSim, cod.producto.id_producto, destino.origen, disponible - cantidad);
      }
    }

    plan.push({
      id_producto: cod.producto?.id_producto,
      codigo: cod.producto?.codigo ?? codigoTexto,
      destino: destinoClave,
      cantidad,
      observaciones: normTexto(row.observaciones),
    });
  });

  return { errores, plan };
}

const VALIDADORES = {
  productos: validarProductos,
  saldos: validarSaldos,
  transferencias: validarTransferencias,
  consumos: validarConsumos,
};

// ---------------------------------------------------------------------------
// Aplicación (una sola transacción -> todo o nada)
// ---------------------------------------------------------------------------

async function aplicar(tipo, plan, req) {
  const connection = await conIdentidad(poolBetrost, req);
  const idUsuario = Number.isInteger(req.user?.id_usuario) ? req.user.id_usuario : null;
  const resultados = [];

  try {
    await connection.beginTransaction();

    if (tipo === "productos") {
      for (const op of plan) {
        const [r] = await connection.query(
          `INSERT INTO productos (codigo, caracteristica, estado, fecha_creacion)
           VALUES (?, ?, 'ACTIVO', NOW())`,
          [op.codigo, op.caracteristica],
        );
        resultados.push({ codigo: op.codigo, estado: "creado" });
        await registrarAuditoria(connection, req, {
          tabla: "productos",
          accion: "INSERT",
          id_registro: r.insertId,
          datos_despues: { codigo: op.codigo, caracteristica: op.caracteristica },
        });
      }
    } else if (tipo === "saldos") {
      for (const op of plan) {
        const [[anterior]] = await connection.query(
          `SELECT cantidad_disponible FROM inventario
           WHERE id_producto = ? AND id_bodega = ? FOR UPDATE`,
          [op.id_producto, op.id_bodega],
        );
        const cantidadAnterior = anterior?.cantidad_disponible ?? 0;

        await connection.query(
          `INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             cantidad_disponible = VALUES(cantidad_disponible),
             fecha_actualizacion = CURRENT_TIMESTAMP`,
          [op.id_producto, op.id_bodega, op.cantidad],
        );

        await connection.query(
          `INSERT INTO movimientos
             (id_producto, id_bodega_destino, id_usuario_responsable, tipo_movimiento, cantidad, observaciones)
           VALUES (?, ?, ?, 'ENTRADA', ?, ?)`,
          [op.id_producto, op.id_bodega, idUsuario, op.cantidad - cantidadAnterior,
            construirObservacionFinal({
              observaciones: op.motivo,
              idBodega: op.id_bodega,
              codigo: op.codigo,
            })],
        );

        resultados.push({ codigo: op.codigo, bodega: op.bodega, cantidad: op.cantidad, estado: "ajustado" });
        await registrarAuditoria(connection, req, {
          tabla: "inventario",
          accion: "AJUSTE",
          datos_despues: { codigo: op.codigo, bodega: op.bodega, cantidad: op.cantidad },
        });
      }
    } else if (tipo === "transferencias") {
      for (const op of plan) {
        const [r] = await connection.query(
          `UPDATE inventario
           SET cantidad_disponible = cantidad_disponible - ?, fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ? AND id_bodega = ? AND cantidad_disponible >= ?`,
          [op.cantidad, op.id_producto, op.id_bodega_origen, op.cantidad],
        );
        if (r.affectedRows === 0) {
          throw new Error(`Stock insuficiente para el producto ${op.codigo} en la bodega origen.`);
        }

        await connection.query(
          `INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             cantidad_disponible = cantidad_disponible + VALUES(cantidad_disponible),
             fecha_actualizacion = CURRENT_TIMESTAMP`,
          [op.id_producto, op.id_bodega_destino, op.cantidad],
        );

        await connection.query(
          `INSERT INTO movimientos
             (id_producto, id_bodega_origen, id_bodega_destino, id_usuario_responsable,
              tipo_movimiento, cantidad, observaciones)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [op.id_producto, op.id_bodega_origen, op.id_bodega_destino, idUsuario,
            op.tipo_movimiento, op.cantidad,
            construirObservacionFinal({
              observaciones: op.observaciones,
              idBodega: op.id_bodega_origen,
              codigo: op.codigo,
            })],
        );

        resultados.push({ codigo: op.codigo, origen: op.origen, destino: op.destino, cantidad: op.cantidad, estado: "transferido" });
        await registrarAuditoria(connection, req, {
          tabla: "movimientos",
          accion: "INSERT",
          datos_despues: { codigo: op.codigo, origen: op.origen, destino: op.destino, cantidad: op.cantidad },
        });
      }
    } else if (tipo === "consumos") {
      for (const op of plan) {
        const destino = DESTINOS_CONSUMO[op.destino];

        const [r] = await connection.query(
          `UPDATE inventario
           SET cantidad_disponible = cantidad_disponible - ?, fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ? AND id_bodega = ? AND cantidad_disponible >= ?`,
          [op.cantidad, op.id_producto, destino.origen, op.cantidad],
        );
        if (r.affectedRows === 0) {
          throw new Error(`Stock insuficiente para el producto ${op.codigo} en ${destino.etiqueta}.`);
        }

        await connection.query(
          `INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             cantidad_disponible = cantidad_disponible + VALUES(cantidad_disponible),
             fecha_actualizacion = CURRENT_TIMESTAMP`,
          [op.id_producto, destino.destino, op.cantidad],
        );

        await connection.query(
          `INSERT INTO movimientos
             (id_producto, id_bodega_origen, id_bodega_destino, id_usuario_responsable,
              tipo_movimiento, cantidad, observaciones)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [op.id_producto, destino.origen, destino.destino, idUsuario,
            destino.tipo_movimiento, op.cantidad,
            construirObservacionFinal({
              observaciones: op.observaciones,
              idBodega: destino.origen,
              codigo: op.codigo,
            })],
        );

        resultados.push({ codigo: op.codigo, destino: destino.etiqueta, cantidad: op.cantidad, estado: "consumido" });
        await registrarAuditoria(connection, req, {
          tabla: "movimientos",
          accion: "INSERT",
          datos_despues: { codigo: op.codigo, destino: destino.etiqueta, cantidad: op.cantidad },
        });
      }
    }

    await connection.commit();
    return { aplicado: true, total: plan.length, resultados };
  } catch (e) {
    await connection.rollback().catch(() => {});
    throw e;
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /import/catalogos
 * Devuelve bodegas, destinos de consumo y la definición de columnas por tipo
 * para que el frontend pueda armar las plantillas y el selector.
 */
export const catalogos = async (req, res) => {
  try {
    const [bodegas] = await poolBetrost.query(
      "SELECT id_bodega, nombre, estado FROM bodegas ORDER BY nombre",
    );

    const columnas = {};
    for (const [tipo, def] of Object.entries(DEFINICIONES)) {
      columnas[tipo] = def.columnas;
    }

    success(req, res, 200, {
      bodegas: bodegas.map((b) => ({ id_bodega: b.id_bodega, nombre: b.nombre, estado: b.estado })),
      prefijos_bodega: PREFIJOS_BODEGA,
      destinos_consumo: Object.entries(DESTINOS_CONSUMO).map(([valor, v]) => ({ valor, etiqueta: v.etiqueta })),
      tipos_transferencia: TIPOS_TRANSFERENCIA,
      tipos: Object.entries(DEFINICIONES).map(([valor, def]) => ({ valor, etiqueta: def.etiqueta })),
      columnas,
    });
  } catch (e) {
    console.error("Error al cargar catálogos de importación:", e);
    error(req, res, 500, "No se pudo cargar el catálogo de importación.");
  }
};

/**
 * POST /import/importar
 * Body: { tipo, filas, confirmar }
 *   - confirmar: false -> solo valida y devuelve errores (previsualización).
 *   - confirmar: true  -> valida y, si no hay errores, aplica la carga.
 */
export const importar = async (req, res) => {
  const { tipo, filas, confirmar } = req.body || {};

  if (!DEFINICIONES[tipo]) {
    return error(req, res, 400, `Tipo de importación inválido. Use: ${Object.keys(DEFINICIONES).join(", ")}.`);
  }

  if (!Array.isArray(filas) || filas.length === 0) {
    return error(req, res, 400, "Debe enviar al menos una fila.");
  }

  if (filas.length > 2000) {
    return error(req, res, 400, "Máximo 2000 filas por importación.");
  }

  try {
    const ctx = await cargarContexto();
    const { errores, plan } = VALIDADORES[tipo](filas, ctx);

    // `validas` = filas sin ningún error (una fila puede tener varios errores).
    const filasConError = new Set(errores.map((e) => e.fila));
    const resumen = {
      total: filas.length,
      validas: filas.length - filasConError.size,
      errores: errores.length,
    };

    // Hay errores: no se aplica nada, se devuelven todos para corregir.
    if (errores.length > 0) {
      return success(req, res, 200, { valido: false, aplicado: false, errores, resumen });
    }

    // Solo validar (previsualización).
    if (!confirmar) {
      return success(req, res, 200, { valido: true, aplicado: false, errores: [], resumen });
    }

    // Aplicar en una sola transacción.
    const resultado = await aplicar(tipo, plan, req);
    return success(req, res, 200, { valido: true, ...resultado, resumen });
  } catch (e) {
    console.error("Error en importación:", e);
    return error(req, res, 500, `Error interno al procesar la importación: ${e.message}`);
  }
};
