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
export async function conIdentidad(pool, req) {
  const connection = await pool.getConnection();

  const idUsuario = Number.isInteger(req?.user?.id_usuario)
    ? req.user.id_usuario
    : null;

  try {
    await connection.query("SET @app_user = ?", [idUsuario]);
  } catch (err) {
    // No se propaga: ver comentario arriba.
    console.error("No se pudo fijar @app_user:", err.message);
  }

  const liberar = connection.release.bind(connection);

  connection.release = function releaseConLimpieza() {
    // Se lanza sin esperar: `release()` se invoca normalmente sin await
    // dentro de los `finally`. Encadenar en vez de devolver una promesa
    // obliga a que la conexión solo vuelva al pool cuando termine el SET.
    connection
      .query("SET @app_user = NULL")
      .catch(() => {})
      .finally(() => liberar());
  };

  return connection;
}
