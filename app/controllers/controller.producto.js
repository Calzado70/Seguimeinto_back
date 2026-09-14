import poolBetrost from "../config/mysql.db";
import { success, error } from "../messages/browser.js";
import { config } from "dotenv";
config();

const consultar_inventario = async (req, res) => {
  const { nombre_bodega } = req.query;

  try {
    let query = `
      SELECT *
      FROM vista_inventario_con_observacion
    `;

    const params = [];

    // 🔍 filtro opcional por bodega
    if (nombre_bodega) {
      query += ` WHERE bodega = ?`;
      params.push(nombre_bodega.trim());
    }

    const [rows] = await poolBetrost.query(query, params);

    if (rows.length > 0) {
      return success(req, res, 200, rows);
    } else {
      return error(
        req,
        res,
        404,
        "No se encontraron productos en el inventario",
      );
    }
  } catch (err) {
    console.error("Error al consultar inventario:", err);

    return error(req, res, 500, "Error interno del servidor");
  }
};

const consultar_stock = async (req, res) => {
  const { codigo_producto } = req.body;

  // Validar que codigo_producto esté presente y sea válido
  if (
    !codigo_producto ||
    typeof codigo_producto !== "string" ||
    codigo_producto.trim() === ""
  ) {
    return error(
      req,
      res,
      400,
      "El código del producto debe ser una cadena no vacía",
    );
  }

  try {
    const [respuesta] = await poolBetrost.query(
      `CALL sp_consultar_stock_producto(?);`,
      [codigo_producto.trim()],
    );
    if (respuesta[0] && respuesta[0].length > 0) {
      success(req, res, 200, respuesta[0]);
    } else {
      error(
        req,
        res,
        404,
        "No se encontró stock disponible para el producto especificado",
      );
    }
  } catch (error) {
    console.error("Error al consultar el stock del producto:", error);
    error(
      req,
      res,
      500,
      "Error interno del servidor al consultar el stock del producto",
    );
  }
};

const consultar_movimientos = async (req, res) => {
  const { id_bodega, fecha_inicio, fecha_fin, codigo_inteligente } = req.query;

  try {
    const [respuesta] = await poolBetrost.query(
      `CALL sp_consultar_movimientos(?, ?, ?, ?);`,
      [
        id_bodega ? parseInt(id_bodega) : null,
        fecha_inicio || null,
        fecha_fin || null,
        codigo_inteligente || null,
      ],
    );

    if (respuesta[0] && respuesta[0].length > 0) {
      return success(req, res, 200, respuesta[0]);
    } else {
      return error(req, res, 404, "No se encontraron movimientos");
    }
  } catch (err) {
    console.error("Error al consultar los movimientos:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor al consultar los movimientos",
    });
  }
};

const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) return false;

  return dateString === date.toISOString().split("T")[0];
};

const iniciar_sesion_escaneo = async (req, res) => {
  const { id_bodega, nombre_usuario, observaciones } = req.body;

  if (!id_bodega || isNaN(id_bodega) || id_bodega <= 0) {
    return error(
      req,
      res,
      400,
      "El ID de la bodega debe ser un número entero positivo",
    );
  }

  if (parseInt(id_bodega) !== 1) {
    return error(
      req,
      res,
      403,
      "Solo se permite iniciar sesión de escaneo en la bodega principal",
    );
  }

  if (!nombre_usuario || typeof nombre_usuario !== "string") {
    return error(
      req,
      res,
      400,
      "El nombre del usuario es requerido y debe ser texto",
    );
  }

  try {
    // 1. Buscar el ID del usuario por nombre
    const [usuarios] = await poolBetrost.query(
      `SELECT id_usuario FROM usuarios WHERE nombre = ? LIMIT 1`,
      [nombre_usuario.trim()],
    );

    if (usuarios.length === 0) {
      return error(req, res, 404, "Usuario no encontrado con ese nombre");
    }

    const id_usuario = usuarios[0].id_usuario;

    // 2. Llamar al procedimiento almacenado con el ID encontrado
    await poolBetrost.query(
      `CALL sp_iniciar_sesion_escaneo(?, ?, ?, @p_id_sesion, @p_mensaje);`,
      [parseInt(id_bodega), id_usuario, observaciones || null],
    );

    const [output] = await poolBetrost.query(
      `SELECT @p_id_sesion AS id_sesion, @p_mensaje AS mensaje`,
    );

    const { id_sesion, mensaje } = output[0];

    if (id_sesion > 0) {
      return success(req, res, 200, { id_sesion, mensaje });
    } else {
      return error(req, res, 400, mensaje);
    }
  } catch (err) {
    console.error("Error al iniciar sesión de escaneo:", err);
    return error(
      req,
      res,
      500,
      "Error interno del servidor al iniciar sesión de escaneo",
    );
  }
};

const agregar_producto_sesion = async (req, res) => {
  console.log("📦 Body recibido en /product/agregar:", req.body);
  const { id_sesion, codigo_producto, cantidad } = req.body;

  // Validate input parameters
  if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
    return error(
      req,
      res,
      400,
      "El ID de la sesión debe ser un número entero positivo",
    );
  }
  if (
    !codigo_producto ||
    typeof codigo_producto !== "string" ||
    codigo_producto.trim() === ""
  ) {
    return error(
      req,
      res,
      400,
      "El código del producto debe ser una cadena no vacía",
    );
  }
  if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
    return error(
      req,
      res,
      400,
      "La cantidad debe ser un número entero positivo",
    );
  }

  try {
    const [result] = await poolBetrost.query(
      `CALL sp_agregar_producto_sesion(?, ?, ?, @p_mensaje);`,
      [parseInt(id_sesion), codigo_producto.trim(), parseInt(cantidad)],
    );

    // Retrieve the output parameter
    const [output] = await poolBetrost.query(`SELECT @p_mensaje AS mensaje`);

    const { mensaje } = output[0];

    console.log("🧩 Mensaje devuelto por el SP:", mensaje);

    if (mensaje === "Producto agregado correctamente") {
      success(req, res, 200, { mensaje });
    } else {
      error(req, res, 400, mensaje);
    }
  } catch (error) {
    console.error("Error al agregar producto a la sesión:", error);
    error(
      req,
      res,
      500,
      "Error interno del servidor al agregar producto a la sesión",
    );
  }
};

const obtener_detalle_sesion = async (req, res) => {
  const { id_sesion } = req.body;

  // Validate input parameter
  if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
    return error(
      req,
      res,
      400,
      "El ID de la sesión debe ser un número entero positivo",
    );
  }

  try {
    const [results] = await poolBetrost.query(
      `CALL sp_obtener_detalle_sesion(?);`,
      [parseInt(id_sesion)],
    );

    // Extract the two result sets
    const sesion = results[0] && results[0].length > 0 ? results[0][0] : null;
    const detalles = results[1] || [];

    if (!sesion) {
      return error(req, res, 404, "No se encontró la sesión especificada");
    }

    // Return both the session summary and product details
    success(req, res, 200, {
      sesion,
      detalles,
    });
  } catch (error) {
    console.error("Error al obtener detalle de la sesión:", error);
    error(
      req,
      res,
      500,
      "Error interno del servidor al obtener detalle de la sesión",
    );
  }
};

const cancelar_sesion_escaneo = async (req, res) => {
  const { id_sesion } = req.body;

  // Validate input parameter
  if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
    return error(
      req,
      res,
      400,
      "El ID de la sesión debe ser un número entero positivo",
    );
  }

  try {
    const [result] = await poolBetrost.query(
      `CALL sp_cancelar_sesion_escaneo(?, @p_mensaje);`,
      [parseInt(id_sesion)],
    );

    // Retrieve the output parameter
    const [output] = await poolBetrost.query(`SELECT @p_mensaje AS mensaje`);

    const { mensaje } = output[0];

    if (mensaje === "Sesión cancelada correctamente") {
      success(req, res, 200, { mensaje });
    } else {
      error(req, res, 400, mensaje);
    }
  } catch (error) {
    console.error("Error al cancelar sesión de escaneo:", error);
    error(
      req,
      res,
      500,
      "Error interno del servidor al cancelar sesión de escaneo",
    );
  }
};

const finalizarSesionEscaneo = async (req, res) => {
  const { id_sesion } = req.body;

  if (!id_sesion) {
    return res.status(400).json({ error: "El id_sesion es requerido" });
  }

  try {
    const connection = await poolBetrost.getConnection();

    try {
      await connection.query(`CALL sp_finalizar_sesion_escaneo(?, @mensaje);`, [
        id_sesion,
      ]);

      const [[{ mensaje }]] = await connection.query(
        `SELECT @mensaje AS mensaje;`,
      );

      console.log("📦 MENSAJE DEL SP:", mensaje);

      if (mensaje.toLowerCase().includes("error")) {
        return res.status(400).json({ mensaje });
      }

      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al finalizar sesión:", error);
    res.status(500).json({ error: "Error al finalizar la sesión de escaneo" });
  }
};

const PREFIJOS_BODEGA = {
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
  23: "PPG",
};

const obtenerPrefijoBodega = (idBodegaOrigen) => {
  return PREFIJOS_BODEGA[idBodegaOrigen] || "PPG";
};

const construirCodigoModificado = (codigoProducto, caracteristica = "") => {
  if (!caracteristica) return codigoProducto;

  return `${codigoProducto.slice(0, -2)}${caracteristica}${codigoProducto.slice(-2)}`;
};

const construirObservacionFinal = ({
  observaciones,
  idBodegaOrigen,
  codigoProducto,
  caracteristica,
}) => {
  const prefijo = obtenerPrefijoBodega(idBodegaOrigen);
  const codigoModificado = construirCodigoModificado(
    codigoProducto,
    caracteristica,
  );

  return `${observaciones || ""} ${prefijo}${codigoModificado}`.trim();
};

const transferirProducto = async (req, res) => {
  let connection;

  try {
    let {
      id_bodega_origen,
      id_bodega_destino,
      codigo_producto,
      cantidad,
      id_usuario,
      observaciones,
      tipo_movimiento,
    } = req.body;

    id_bodega_origen = Number.parseInt(id_bodega_origen, 10);
    id_bodega_destino = Number.parseInt(id_bodega_destino, 10);
    cantidad = Number.parseInt(cantidad, 10);
    id_usuario = Number.parseInt(id_usuario, 10);
    codigo_producto = codigo_producto?.trim();
    observaciones = observaciones?.trim() || "";
    tipo_movimiento = tipo_movimiento?.trim()?.toUpperCase();

    if (
      Number.isNaN(id_bodega_origen) ||
      Number.isNaN(id_bodega_destino) ||
      Number.isNaN(cantidad) ||
      Number.isNaN(id_usuario) ||
      !codigo_producto ||
      !tipo_movimiento
    ) {
      return error(
        req,
        res,
        400,
        "Faltan campos requeridos para la transferencia",
      );
    }

    if (cantidad <= 0) {
      return error(req, res, 400, "La cantidad debe ser mayor a 0");
    }

    if (id_bodega_origen === id_bodega_destino) {
      return error(
        req,
        res,
        400,
        "La bodega origen y destino no pueden ser iguales",
      );
    }

    const tiposValidos = ["ENTRADA", "PROCESO", "COMPLETO"];
    if (!tiposValidos.includes(tipo_movimiento)) {
      return error(req, res, 400, "Tipo de movimiento invalido");
    }

    connection = await poolBetrost.getConnection();

    const [[usuario]] = await connection.query(
      `SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [id_usuario],
    );

    if (!usuario) {
      return error(req, res, 404, "Usuario no existe");
    }

    const [[producto]] = await connection.query(
      `
    SELECT 
      id_producto,
      codigo,
      estado,
      IFNULL(caracteristica, '') AS caracteristica
    FROM productos
    WHERE TRIM(codigo) = TRIM(?)
      AND UPPER(TRIM(estado)) = 'ACTIVO'
    LIMIT 1
  `,
      [codigo_producto],
    );
    console.log("CODIGO QUE LLEGA:", JSON.stringify(codigo_producto));

    if (!producto) {
      return error(req, res, 404, "Producto no encontrado");
    }

    const observacionFinal = construirObservacionFinal({
      observaciones,
      idBodegaOrigen: id_bodega_origen,
      codigoProducto: codigo_producto,
      caracteristica: producto.caracteristica,
    });

    await connection.query(
      `CALL sp_transferir_productos(?, ?, ?, ?, ?, ?, ?, @mensaje);`,
      [
        id_bodega_origen,
        id_bodega_destino,
        codigo_producto,
        cantidad,
        id_usuario,
        observacionFinal,
        tipo_movimiento,
      ],
    );

    const [[mensajeResult]] = await connection.query(
      `SELECT @mensaje AS mensaje;`,
    );
    const mensaje = mensajeResult?.mensaje || "Respuesta desconocida";

    const esError = [
      "stock insuficiente",
      "error",
      "no existe",
      "no encontrado",
    ].some((texto) => mensaje.toLowerCase().includes(texto));

    if (esError) {
      return error(req, res, 400, mensaje);
    }

    return success(
      req,
      res,
      200,
      { mensaje },
      "PRODUCTO TRANSFERIDO EXITOSAMENTE",
    );
  } catch (err) {
    console.error("Error transferencia:", {
      error: err.message,
      body: req.body,
    });

    return error(
      req,
      res,
      500,
      "Error interno del servidor al transferir producto",
    );
  } finally {
    if (connection) connection.release();
  }
};

const finalizarProductoTerminada = async (req, res) => {
  let {
    codigo_producto,
    caracteristica,
    cantidad,
    id_bodega_origen,
    id_bodega_destino,
    id_usuario,
    tipo_movimiento,
  } = req.body;

  id_bodega_origen = Number.parseInt(id_bodega_origen, 10);
  id_bodega_destino = Number.parseInt(id_bodega_destino, 10) || id_bodega_origen;
  cantidad = Number.parseInt(cantidad, 10);
  id_usuario = Number.parseInt(id_usuario, 10);
  codigo_producto = codigo_producto?.trim();
  caracteristica = caracteristica?.trim() || "";
  tipo_movimiento = tipo_movimiento?.trim()?.toUpperCase() || "COMPLETO";

  if (
    Number.isNaN(id_bodega_origen) ||
    Number.isNaN(cantidad) ||
    Number.isNaN(id_usuario) ||
    !codigo_producto
  ) {
    return error(
      req,
      res,
      400,
      "Faltan campos requeridos para finalizar el producto",
    );
  }

  if (cantidad <= 0) {
    return error(req, res, 400, "La cantidad debe ser mayor a 0");
  }

  if (!caracteristica) {
    return error(req, res, 400, "La característica es obligatoria");
  }

  // Agregar cero adelante si la característica tiene menos de 4 caracteres (ej: 30P → 030P)
  if (caracteristica.length < 4) {
    caracteristica = caracteristica.padStart(4, "0");
  }

  const tiposValidos = ["ENTRADA", "PROCESO", "COMPLETO"];
  if (!tiposValidos.includes(tipo_movimiento)) {
    return error(req, res, 400, "Tipo de movimiento inválido");
  }

  let connection;

  try {
    connection = await poolBetrost.getConnection();

    // 1. Validar usuario
    const [[usuario]] = await connection.query(
      `SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [id_usuario],
    );
    if (!usuario) {
      return error(req, res, 404, "Usuario no existe");
    }

    // 2. Quitar prefijo si viene con el (PPC/PPG/PPM/PPI/PPV/PPT)
    let baseCodigo = codigo_producto;
    if (/^(PPC|PPG|PPM|PPI|PPV|PPT)/.test(codigo_producto)) {
      baseCodigo = codigo_producto.substring(3);
    }

    // 3. Validar que el código base tenga suficientes caracteres
    if (baseCodigo.length < 3) {
      return error(req, res, 400, "Código demasiado corto");
    }

    // 4. Construir código final: base[0..-2] + caracteristica + base[-2..]
    const codigoFinal =
      baseCodigo.slice(0, -2) + caracteristica + baseCodigo.slice(-2);

    // 5. Obtener producto origen
    const [[producto]] = await connection.query(
      `SELECT id_producto FROM productos WHERE codigo = ? AND estado = 'ACTIVO' LIMIT 1`,
      [baseCodigo],
    );
    if (!producto) {
      return error(req, res, 404, "Producto no encontrado");
    }

    // 6. Determinar bodegas según el flujo
    let bodegaConsumo;
    let bodegaDestino;
    let crearProductoNuevo;

    // Terminada Completo (25) + COMPLETO → consume de Terminada Proceso (6) → crea producto nuevo
    if (id_bodega_origen === 25 && tipo_movimiento === "COMPLETO") {
      bodegaConsumo = 6;
      bodegaDestino = 25;
      crearProductoNuevo = 1;
    }
    // Terminada Proceso (6) + PROCESO/ENTRADA → consume de Montaje Completo (21) → mantiene código
    else if (id_bodega_origen === 6 && ["PROCESO", "ENTRADA"].includes(tipo_movimiento)) {
      bodegaConsumo = 21;
      bodegaDestino = 6;
      crearProductoNuevo = 0;
    }
    // Flujo normal
    else {
      bodegaConsumo = id_bodega_origen;
      bodegaDestino = id_bodega_destino;
      crearProductoNuevo = 1;
    }

    // 7. Construir observación
    const observacion = `${crearProductoNuevo ? codigoFinal : baseCodigo}`;

    // DEBUG - eliminar después
    console.log("=== FINALIZAR TERMINADA ===");
    console.log("id_bodega_origen:", id_bodega_origen);
    console.log("tipo_movimiento:", tipo_movimiento);
    console.log("baseCodigo:", baseCodigo);
    console.log("codigoFinal:", codigoFinal);
    console.log("crearProductoNuevo:", crearProductoNuevo);
    console.log("bodegaConsumo:", bodegaConsumo);
    console.log("bodegaDestino:", bodegaDestino);
    console.log("codigo enviado al SP:", crearProductoNuevo ? codigoFinal : baseCodigo);
    console.log("===========================");

    // 8. Llamar SP simplificado
    await connection.query(
      `CALL sp_finalizar_producto_terminada(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @mensaje);`,
      [
        producto.id_producto,
        crearProductoNuevo ? codigoFinal : baseCodigo,
        caracteristica,
        cantidad,
        bodegaConsumo,
        bodegaDestino,
        id_usuario,
        tipo_movimiento,
        observacion,
        crearProductoNuevo,
      ],
    );

    const [[{ mensaje }]] = await connection.query(
      `SELECT @mensaje AS mensaje;`,
    );

    const esError = ["insuficiente", "error"].some((texto) =>
      mensaje.toLowerCase().includes(texto),
    );

    if (esError) {
      return error(req, res, 400, mensaje);
    }

    return success(
      req,
      res,
      200,
      { mensaje, codigo: crearProductoNuevo ? codigoFinal : baseCodigo },
      "PRODUCTO FINALIZADO EN TERMINADA EXITOSAMENTE",
    );
  } catch (err) {
    console.error("Error al finalizar producto en terminada:", err);
    return error(
      req,
      res,
      500,
      "Error interno del servidor al finalizar producto en terminada",
    );
  } finally {
    if (connection) connection.release();
  }
};

const ajustarInventario = async (req, res) => {
  const { id_bodega, codigo_producto, nueva_cantidad, id_usuario, motivo } =
    req.body;

  if (
    !id_bodega ||
    !codigo_producto ||
    nueva_cantidad === undefined ||
    !id_usuario
  ) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const connection = await poolBetrost.getConnection();
    try {
      const [_, result] = await connection.query(
        `
        CALL sp_ajustar_inventario(?, ?, ?, ?, ?, @mensaje);
        SELECT @mensaje AS mensaje;
      `,
        [id_bodega, codigo_producto, nueva_cantidad, id_usuario, motivo || ""],
      );

      const mensaje = result[1][0].mensaje;
      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al ajustar inventario:", error);
    res.status(500).json({ error: "Error interno al ajustar inventario" });
  }
};

const crear_producto = async (req, res) => {
  let { codigo, caracteristica } = req.body;

  // Validar el código
  if (!codigo || typeof codigo !== "string" || codigo.trim() === "") {
    return error(req, res, 400, "El código es obligatorio y debe ser texto.");
  }

  // Si no hay caracteristica, usar "N/A" por defecto
  if (
    !caracteristica ||
    typeof caracteristica !== "string" ||
    caracteristica.trim() === ""
  ) {
    caracteristica = "";
  }

  try {
    await poolBetrost.query(`CALL sp_crear_producto(?, ?)`, [
      codigo.trim(),
      caracteristica.trim(),
    ]);

    success(req, res, 200, { mensaje: "Producto creado correctamente." });
  } catch (err) {
    console.error("Error al crear producto:", err);

    if (err.errno === 1062) {
      return error(
        req,
        res,
        400,
        "El código ya está registrado o está inactivo.",
      );
    }

    error(req, res, 500, "Error interno del servidor al crear el producto.");
  }
};

const actualizarCaracteristica = async (req, res) => {
  console.log("BODY RECIBIDO:", req.body);
  const { codigo_producto, nueva_caracteristica } = req.body;

  if (!codigo_producto || !nueva_caracteristica) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const connection = await poolBetrost.getConnection();
    try {
      const [result] = await connection.query(
        `CALL sp_actualizar_caracteristica_producto(?, ?, @mensaje);`,
        [codigo_producto, nueva_caracteristica],
      );

      const [mensajeResult] = await connection.query(
        `SELECT @mensaje AS mensaje;`,
      );
      const mensaje = mensajeResult[0].mensaje;
      console.log("MENSAJE SP:", mensaje);

      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al actualizar característica:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// CONTROLADORES PARA LA CONSULTA CREAR MODIFICAR O INHABILITAR PRODUCTOS EN EL CATALOGO

const consultarCodigo = async (req, res) => {
  const { codigo_barras } = req.body;

  if (!codigo_barras) {
    return res.status(400).json({
      ok: false,
      mensaje: "Código requerido",
    });
  }

  try {
    const [rows] = await poolBetrost.query(
      `
            SELECT 
id_catalogo,
referencia,
sku,
codigo_barras,
fecha_creacion,
estado
            FROM catalogo_productos
            WHERE codigo_barras = ?
            AND estado = 1
            `,
      [codigo_barras],
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        mensaje: "Código no registrado",
      });
    }

    return res.status(200).json({
      ok: true,
      producto: rows[0],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      ok: false,
      mensaje: "Error interno",
    });
  }
};

const listar_catalogo = async (req, res) => {
  try {
    const [rows] = await poolBetrost.query(`

SELECT
id_catalogo,
referencia,
sku,
codigo_barras,
fecha_creacion,
estado

FROM catalogo_productos

ORDER BY id_catalogo DESC

`);

    return success(req, res, 200, rows);
  } catch (err) {
    console.error(err);

    return error(req, res, 500, "Error consultando catálogo");
  }
};

const crear_catalogo = async (req, res) => {
  const { referencia, sku, codigo_barras } = req.body;

  if (!referencia || !sku || !codigo_barras) {
    return error(req, res, 400, "Todos los campos son obligatorios");
  }

  try {
    await poolBetrost.query(
      `
INSERT INTO catalogo_productos
(
referencia,
sku,
codigo_barras,
fecha_creacion,
estado
)

VALUES
(?,?,?,NOW(),1)

`,
      [referencia, sku, codigo_barras],
    );

    return success(req, res, 200, {
      mensaje: "Producto agregado al catálogo",
    });
  } catch (err) {
    console.error(err);

    if (err.errno === 1062) {
      return error(req, res, 400, "El código ya existe");
    }

    return error(req, res, 500, "Error creando producto");
  }
};

const actualizar_catalogo = async (req, res) => {
  const { id_catalogo, referencia, sku, codigo_barras } = req.body;

  try {
    await poolBetrost.query(
      `

UPDATE catalogo_productos

SET

referencia=?,
sku=?,
codigo_barras=?

WHERE id_catalogo=?


`,
      [referencia, sku, codigo_barras, id_catalogo],
    );

    return success(req, res, 200, {
      mensaje: "Catálogo actualizado",
    });
  } catch (err) {
    console.error(err);

    return error(req, res, 500, "Error actualizando catálogo");
  }
};

const inhabilitar_catalogo = async (req, res) => {

  const { id_catalogo } = req.body;


  if (!id_catalogo) {

    return res.status(400).json({
      ok:false,
      mensaje:"ID del producto requerido"
    });

  }


  try {


    const [resultado] = await poolBetrost.query(

      `
      UPDATE catalogo_productos
      SET estado='INACTIVO'
      WHERE id_catalogo=?
      `,

      [id_catalogo]

    );



    if(resultado.affectedRows === 0){

      return res.status(404).json({

        ok:false,

        mensaje:"Producto no encontrado"

      });

    }



    return res.status(200).json({

      ok:true,

      mensaje:"Producto inhabilitado correctamente"

    });



  } catch(error){


    console.error("ERROR INHABILITAR:",error);


    return res.status(500).json({

      ok:false,

      mensaje:"Error interno al inhabilitar producto"

    });


  }

};

// ============================================================
// CONSUMO A LOGÍSTICA (Terminada Completo 25 → Logística 27)
// ============================================================

const BODEGA_TERMINADA_COMPLETO = 25;
const BODEGA_LOGISTICA = 27;

const consultarConsumoLogistica = async (req, res) => {
  const { codigo_barras } = req.query;

  if (!codigo_barras || typeof codigo_barras !== "string" || codigo_barras.trim() === "") {
    return error(req, res, 400, "El código de barras es obligatorio");
  }

  const barcode = codigo_barras.trim();

  try {
    // 1. Buscar la referencia en el catálogo
    const [rows] = await poolBetrost.query(
      `
      SELECT
        id_catalogo,
        referencia,
        sku,
        codigo_barras
      FROM catalogo_productos
      WHERE codigo_barras = ?
      AND estado = 1
      LIMIT 1
      `,
      [barcode],
    );

    if (!rows.length) {
      return error(req, res, 404, "Código de barras no registrado en el catálogo");
    }

    const catalogo = rows[0];
    const talla = barcode.slice(-2);
    const codigoProducto = `${catalogo.referencia}${talla}`;

    // 2. Buscar el producto y su stock en Terminada Completo (25)
    const [productoRows] = await poolBetrost.query(
      `
      SELECT
        p.id_producto,
        p.codigo,
        p.caracteristica,
        IFNULL(i.cantidad_disponible, 0) AS stock_disponible
      FROM productos p
      LEFT JOIN inventario i
        ON i.id_producto = p.id_producto
       AND i.id_bodega = ?
      WHERE p.codigo = ?
        AND p.estado = 'ACTIVO'
      LIMIT 1
      `,
      [BODEGA_TERMINADA_COMPLETO, codigoProducto],
    );

    const producto = productoRows[0] || null;

    return success(req, res, 200, {
      codigo_barras: barcode,
      referencia: catalogo.referencia,
      sku: catalogo.sku,
      talla,
      codigo_producto: codigoProducto,
      id_producto: producto ? producto.id_producto : null,
      caracteristica: producto ? producto.caracteristica : "",
      stock_disponible: producto ? producto.stock_disponible : 0,
      bodega_terminada_completo: BODEGA_TERMINADA_COMPLETO,
      bodega_logistica: BODEGA_LOGISTICA,
    });
  } catch (err) {
    console.error("Error consultando consumo logística:", err);
    return error(req, res, 500, "Error interno del servidor al consultar el producto");
  }
};

const ejecutarConsumoLogistica = async (req, res) => {
  let { codigo_producto, cantidad, id_usuario, observaciones } = req.body;

  codigo_producto = codigo_producto?.trim();
  cantidad = Number.parseInt(cantidad, 10);
  id_usuario = Number.parseInt(id_usuario, 10);
  observaciones = observaciones?.trim() || "";

  if (!codigo_producto || Number.isNaN(cantidad) || cantidad <= 0 || Number.isNaN(id_usuario)) {
    return error(req, res, 400, "Código del producto, cantidad e id_usuario son obligatorios");
  }

  let connection;

  try {
    connection = await poolBetrost.getConnection();

    const [[usuario]] = await connection.query(
      `SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [id_usuario],
    );

    if (!usuario) {
      return error(req, res, 404, "Usuario no existe");
    }

    const [[producto]] = await connection.query(
      `
      SELECT id_producto
      FROM productos
      WHERE codigo = ? AND estado = 'ACTIVO'
      LIMIT 1
      `,
      [codigo_producto],
    );

    if (!producto) {
      return error(req, res, 404, "Producto no encontrado");
    }

    await connection.query(
      `CALL sp_consumo_logistica(?, ?, ?, ?, ?, ?, @mensaje);`,
      [
        BODEGA_TERMINADA_COMPLETO,
        BODEGA_LOGISTICA,
        codigo_producto,
        cantidad,
        id_usuario,
        observaciones,
      ],
    );

    const [[mensajeResult]] = await connection.query(`SELECT @mensaje AS mensaje;`);
    const mensaje = mensajeResult?.mensaje || "Respuesta desconocida";

    const esError = ["insuficiente", "error", "no existe", "no encontrado"].some((texto) =>
      mensaje.toLowerCase().includes(texto),
    );

    if (esError) {
      return error(req, res, 400, mensaje);
    }

    return success(
      req,
      res,
      200,
      { mensaje, codigo_producto, cantidad },
      "CONSUMO A LOGÍSTICA EXITOSO",
    );
  } catch (err) {
    console.error("Error ejecutando consumo logística:", err);
    return error(req, res, 500, "Error interno del servidor al consumir a logística");
  } finally {
    if (connection) connection.release();
  }
};

const activar_catalogo = async (req,res)=>{


const {id_catalogo}=req.body;



try{


const [resultado]=await poolBetrost.query(

`
UPDATE catalogo_productos

SET estado='ACTIVO'

WHERE id_catalogo=?

`,

[id_catalogo]


);



return res.json({

ok:true,

mensaje:"Producto activado"

});


}catch(error){


console.error(error);


return res.status(500).json({

ok:false,

mensaje:"Error activando producto"

});


}


};

export {
  consultar_inventario,
  consultar_movimientos,
  consultar_stock,
  iniciar_sesion_escaneo,
  agregar_producto_sesion,
  obtener_detalle_sesion,
  cancelar_sesion_escaneo,
  finalizarSesionEscaneo,
  transferirProducto,
  finalizarProductoTerminada,
  ajustarInventario,
  crear_producto,
  actualizarCaracteristica,
  consultarCodigo,
  listar_catalogo,
  crear_catalogo,
  actualizar_catalogo,
  inhabilitar_catalogo,
  activar_catalogo,
  consultarConsumoLogistica,
  ejecutarConsumoLogistica,
};
