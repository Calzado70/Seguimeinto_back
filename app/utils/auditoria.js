/* Escritura de la tabla `auditoria` (Fase 4.3).
 *
 * La auditoría se escribe desde la aplicación y no desde triggers, porque
 * un trigger de MySQL no tiene acceso a `req.user`: solo ve el estado de
 * la transacción. La identidad, la IP y el user-agent existen en la capa
 * HTTP, así que aquí es donde deben registrarse.
 *
 * Dos reglas que no son estética:
 *
 *  - `id_usuario` es anulable y además se guarda `usuario` (el nombre en
 *    el momento del hecho). Si se audita la baja de un usuario y la clave
 *    ajena fuera RESTRICT, ese usuario nunca podría eliminarse: la
 *    auditoría se volvería contradictoria. ON DELETE SET NULL + el nombre
 *    resuelven eso.
 *
 *  - Un fallo de auditoría nunca debe tumbar la operación auditada. Se
 *    intenta escribir, se loguea el error y se sigue. Perder una línea de
 *    auditoría es preferible a que falle una transferencia de inventario.
 */

/**
 * Extrae del request la información de quién y desde dónde se actuó.
 * `X-Forwarded-For` solo si hay `trust proxy` configurado; si no,
 * `req.ip` ya es la dirección real del socket.
 */
export function contextoSolicitud(req) {
  const user = req.user || {};

  return {
    id_usuario: Number.isInteger(user.id_usuario) ? user.id_usuario : null,
    usuario: typeof user.nombre === "string" ? user.nombre : null,
    ip: req.ip || null,
    user_agent:
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"].slice(0, 512)
        : null,
  };
}

/**
 * Registra una acción. Nunca lanza: `pool` debe ser el mismo que ejecutó
 * la operación auditada para que quede en la misma transacción cuando la
 * haya.
 *
 * @param {import('mysql2/promise').Pool|Object} pool
 * @param {import('express').Request} req
 * @param {object} detalle  { tabla, accion, id_registro, datos_antes, datos_despues }
 */
export async function registrarAuditoria(pool, req, detalle) {
  try {
    const { tabla, accion, id_registro = null, datos_antes = null, datos_despues = null } =
      detalle;

    if (!tabla || !accion) {
      console.error("Auditoría omitida: falta tabla o acción", detalle);
      return;
    }

    const contexto = contextoSolicitud(req);

    await pool.query(
      `INSERT INTO auditoria
         (tabla, accion, id_registro, id_usuario, usuario, ip, user_agent,
          datos_antes, datos_despues)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tabla,
        accion,
        id_registro,
        contexto.id_usuario,
        contexto.usuario,
        contexto.ip,
        contexto.user_agent,
        serializar(datos_antes),
        serializar(datos_despues),
      ]
    );
  } catch (err) {
    // No propagar: la operación principal ya se ejecutó.
    console.error("No se pudo registrar la auditoría:", err.message);
  }
}

/**
 * Los datos van como JSON. `mysql2` no serializa objetos y los envía como
 * `[object Object]`, que MySQL rechazaría por `json_valid`, así que se
 * serializa aquí de forma explícita.
 */
function serializar(valor) {
  if (valor === null || valor === undefined) return null;

  try {
    return JSON.stringify(valor);
  } catch (err) {
    return null;
  }
}

/**
 * Reduce una fila a sus columnas, para guardar el antes/después sin
 * arrastrar columnas derivadas o demasiado largas.
 */
export function recortarFila(fila, columnas) {
  if (!fila) return null;

  if (!Array.isArray(columnas)) return fila;

  const salida = {};
  for (const columna of columnas) {
    if (columna in fila) salida[columna] = fila[columna];
  }
  return salida;
}
