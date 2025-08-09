import poolBetrost from "../config/mysql.db";
import { success, error } from "../messages/browser.js";
import { config } from "dotenv";
config();

const consultar_inventario = async (req, res) => {
  const { nombre_bodega } = req.query;

  try {
    const [respuesta] = await poolBetrost.query(
      `CALL sp_consultar_inventario_bodega(?);`,
      [nombre_bodega ? nombre_bodega.trim() : null]
    );

    if (respuesta[0]?.mensaje === "Bodega no encontrada") {
      return error(req, res, 404, "No se encontró la bodega especificada");
    }

    if (respuesta[0]?.length > 0) {
      return success(req, res, 200, respuesta[0]);
    } else {
      return error(
        req,
        res,
        404,
        "No se encontraron productos en el inventario"
      );
    }
  } catch (error) {
    console.error("Error al consultar el inventario:", error);
    return error(
      req,
      res,
      500,
      "Error interno del servidor al consultar el inventario"
    );
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
      "El código del producto debe ser una cadena no vacía"
    );
  }

  try {
    const [respuesta] = await poolBetrost.query(
      `CALL sp_consultar_stock_producto(?);`,
      [codigo_producto.trim()]
    );
    if (respuesta[0] && respuesta[0].length > 0) {
      success(req, res, 200, respuesta[0]);
    } else {
      error(
        req,
        res,
        404,
        "No se encontró stock disponible para el producto especificado"
      );
    }
  } catch (error) {
    console.error("Error al consultar el stock del producto:", error);
    error(
      req,
      res,
      500,
      "Error interno del servidor al consultar el stock del producto"
    );
  }
};

const consultar_movimientos = async (req, res) => {
  const { id_bodega, fecha_inicio, fecha_fin } = req.query;

  try {
    const [respuesta] = await poolBetrost.query(
      `CALL sp_consultar_movimientos(?, ?, ?);`,
      [
        id_bodega ? parseInt(id_bodega) : null,
        fecha_inicio || null,
        fecha_fin || null
      ]
    );

    if (respuesta[0] && respuesta[0].length > 0) {
      return success(req, res, 200, respuesta[0]);
    } else {
      return error(req, res, 404, "No se encontraron movimientos");
    }
  } catch (error) {
    console.error("Error al consultar los movimientos:", error);
    return error(
      req,
      res,
      500,
      "Error interno del servidor al consultar los movimientos"
    );
  }
};



const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;
  
  return dateString === date.toISOString().split('T')[0];
};

const iniciar_sesion_escaneo = async (req, res) => {
  const { id_bodega, nombre_usuario, observaciones } = req.body;

  if (!id_bodega || isNaN(id_bodega) || id_bodega <= 0) {
    return error(
      req,
      res,
      400,
      "El ID de la bodega debe ser un número entero positivo"
    );
  }

  if (!nombre_usuario || typeof nombre_usuario !== "string") {
    return error(
      req,
      res,
      400,
      "El nombre del usuario es requerido y debe ser texto"
    );
  }

  try {
    // 1. Buscar el ID del usuario por nombre
    const [usuarios] = await poolBetrost.query(
      `SELECT id_usuario FROM usuarios WHERE nombre = ? LIMIT 1`,
      [nombre_usuario.trim()]
    );

    if (usuarios.length === 0) {
      return error(req, res, 404, "Usuario no encontrado con ese nombre");
    }

    const id_usuario = usuarios[0].id_usuario;

    // 2. Llamar al procedimiento almacenado con el ID encontrado
    await poolBetrost.query(
      `CALL sp_iniciar_sesion_escaneo(?, ?, ?, @p_id_sesion, @p_mensaje);`,
      [parseInt(id_bodega), id_usuario, observaciones || null]
    );

    const [output] = await poolBetrost.query(
      `SELECT @p_id_sesion AS id_sesion, @p_mensaje AS mensaje`
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
      "Error interno del servidor al iniciar sesión de escaneo"
    );
  }
};

const agregar_producto_sesion = async (req, res) => {
  const { id_sesion, codigo_producto, cantidad } = req.body;

  // Validate input parameters
  if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
    return error(
      req,
      res,
      400,
      "El ID de la sesión debe ser un número entero positivo"
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
      "El código del producto debe ser una cadena no vacía"
    );
  }
  if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
    return error(
      req,
      res,
      400,
      "La cantidad debe ser un número entero positivo"
    );
  }

  try {
    const [result] = await poolBetrost.query(
      `CALL sp_agregar_producto_sesion(?, ?, ?, @p_mensaje);`,
      [parseInt(id_sesion), codigo_producto.trim(), parseInt(cantidad)]
    );

    // Retrieve the output parameter
    const [output] = await poolBetrost.query(`SELECT @p_mensaje AS mensaje`);

    const { mensaje } = output[0];

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
      "Error interno del servidor al agregar producto a la sesión"
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
      "El ID de la sesión debe ser un número entero positivo"
    );
  }

  try {
    const [results] = await poolBetrost.query(
      `CALL sp_obtener_detalle_sesion(?);`,
      [parseInt(id_sesion)]
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
      "Error interno del servidor al obtener detalle de la sesión"
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
      "El ID de la sesión debe ser un número entero positivo"
    );
  }

  try {
    const [result] = await poolBetrost.query(
      `CALL sp_cancelar_sesion_escaneo(?, @p_mensaje);`,
      [parseInt(id_sesion)]
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
      "Error interno del servidor al cancelar sesión de escaneo"
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
        `SELECT @mensaje AS mensaje;`
      );

      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al finalizar sesión:", error);
    res.status(500).json({ error: "Error al finalizar la sesión de escaneo" });
  }
};

const transferirProducto = async (req, res) => {
  const {
    id_bodega_origen,
    id_bodega_destino,
    codigo_producto,
    cantidad,
    id_usuario,
    observaciones,
    tipo_movimiento,
  } = req.body;

  if (
    !id_bodega_origen ||
    !id_bodega_destino ||
    !codigo_producto ||
    !cantidad ||
    !id_usuario ||
    !tipo_movimiento
  ) {
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos para la transferencia" });
  }

  try {
    const connection = await poolBetrost.getConnection();
    console.log("➡️ Body recibido:", req.body);
    console.log("➡️ id_usuario:", id_usuario);
    
    try {
      const [results] = await connection.query(
        `CALL sp_transferir_productos(?, ?, ?, ?, ?, ?, ?, @mensaje);`,
        [
          id_bodega_origen,
          id_bodega_destino,
          codigo_producto,
          cantidad,
          id_usuario,
          observaciones || "",
          tipo_movimiento,
        ]
      );
      
      console.log("👉 Debug del procedimiento:", results);
      
      const [mensajeResult] = await connection.query(
        `SELECT @mensaje AS mensaje;`
      );
      
      const mensaje = mensajeResult[0].mensaje;
      console.log("📝 Mensaje del SP:", mensaje);
      
      // ✅ VERIFICAR SI HAY ERRORES Y DEVOLVER SOLO EL ERROR
      if (mensaje.includes('Stock insuficiente')) {
        return res.status(400).json({ 
          error: mensaje 
        });
      }
      
      if (mensaje.includes('Error') || 
          mensaje.includes('no existe') || 
          mensaje.includes('no encontrado')) {
        return res.status(400).json({ 
          error: mensaje 
        });
      }
      
      // Solo si es exitoso
      success(req, res, 200, { mensaje }, "PRODUCTO TRANSFERIDO EXITOSAMENTE");
      
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al transferir producto:", error);
    error(req, res, 500, "Error interno al transferir producto");
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
        [id_bodega, codigo_producto, nueva_cantidad, id_usuario, motivo || ""]
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
    caracteristica = "N/A";
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
        "El código ya está registrado o está inactivo."
      );
    }

    error(req, res, 500, "Error interno del servidor al crear el producto.");
  }
};


const actualizarCaracteristica = async (req, res) => {
  const { codigo_producto, nueva_caracteristica } = req.body;

  if (!codigo_producto || !nueva_caracteristica) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const connection = await poolBetrost.getConnection();
    try {
      const [result] = await connection.query(
        `CALL sp_actualizar_caracteristica_producto(?, ?, @mensaje);`,
        [codigo_producto, nueva_caracteristica]
      );

      const [mensajeResult] = await connection.query(`SELECT @mensaje AS mensaje;`);
      const mensaje = mensajeResult[0].mensaje;

      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al actualizar característica:", error);
    res.status(500).json({ error: "Error interno del servidor" });
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
  ajustarInventario,
  crear_producto,
  actualizarCaracteristica,
};
