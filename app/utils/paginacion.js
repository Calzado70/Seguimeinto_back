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
export const LIMITE_MAXIMO = 200;

/** Página y límite por defecto cuando el cliente no los envía. */
export const PAGINA_POR_DEFECTO = 1;
export const LIMITE_POR_DEFECTO = 20;

/**
 * Convierte un valor de query en entero, o devuelve `defecto` si no es
 * utilizable. Rechaza NaN, negativos, decimales y valores no numéricos en
 * lugar de propagarlos a la consulta.
 */
function aEnteroSeguro(valor, defecto, minimo, maximo) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return defecto;

  const entero = Math.trunc(numero);

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
export function normalizarPaginacion(query = {}) {
  const page = aEnteroSeguro(
    query.page,
    PAGINA_POR_DEFECTO,
    1,
    Number.MAX_SAFE_INTEGER
  );

  const limit = aEnteroSeguro(
    query.limit,
    LIMITE_POR_DEFECTO,
    1,
    LIMITE_MAXIMO
  );

  return { page, limit, offset: (page - 1) * limit };
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
export async function contarFilas(pool, tabla, where = "", params = []) {
  const sql = `SELECT COUNT(*) AS total FROM ${tabla}${
    where ? ` WHERE ${where}` : ""
  }`;

  const [rows] = await pool.query(sql, params);

  return rows[0]?.total ?? 0;
}

/**
 * Publica el total de coincidencias en la cabecera `X-Total-Count`.
 * Ya está expuesta en CORS por app.js, así que el frontend la puede leer.
 */
export function enviarTotalCount(res, total) {
  res.set("X-Total-Count", String(total));
}
