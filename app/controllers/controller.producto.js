import poolBetrost from "../config/mysql.db";
import {success, error} from "../messages/browser.js";
import { config } from "dotenv";
config();


const consultar_inventario = async (req, res) => {
    const { id_bodega } = req.body;

    // Validar que id_bodega sea un número entero positivo
    if (!id_bodega || isNaN(id_bodega) || id_bodega <= 0) {
        return error(req, res, 400, 'El ID de la bodega debe ser un número entero positivo');
    }

    try {
        const [respuesta] = await poolBetrost.query(`CALL sp_consultar_inventario_bodega(?);`, [id_bodega]);
        if (respuesta.length > 0) {
            success(req, res, 200, respuesta);
        } else {
            error(req, res, 404, 'No se encontraron productos en el inventario');
        }
    } catch (error) {
        console.error('Error al consultar el inventario:', error);
        error(req, res, 500, 'Error interno del servidor al consultar el inventario');
    }
};


const consultar_stock = async (req, res) => {
    const { codigo_producto } = req.body;

    // Validar que codigo_producto esté presente y sea válido
    if (!codigo_producto || typeof codigo_producto !== 'string' || codigo_producto.trim() === '') {
        return error(req, res, 400, 'El código del producto debe ser una cadena no vacía');
    }

    try {
        const [respuesta] = await poolBetrost.query(`CALL sp_consultar_stock_producto(?);`, [codigo_producto.trim()]);
        if (respuesta[0] && respuesta[0].length > 0) {
            success(req, res, 200, respuesta[0]);
        } else {
            error(req, res, 404, 'No se encontró stock disponible para el producto especificado');
        }
    } catch (error) {
        console.error('Error al consultar el stock del producto:', error);
        error(req, res, 500, 'Error interno del servidor al consultar el stock del producto');
    }
};


const consultar_movimientos = async (req, res) => {
    const { id_bodega, fecha_inicio, fecha_fin } = req.body;

    // Validar parámetros de entrada
    if (!id_bodega || isNaN(id_bodega) || id_bodega <= 0) {
        return error(req, res, 400, 'El ID de la bodega debe ser un número entero positivo');
    }
    if (!fecha_inicio || !fecha_fin) {
        return error(req, res, 400, 'Las fechas de inicio y fin son obligatorias');
    }
    if (!isValidDate(fecha_inicio) || !isValidDate(fecha_fin)) {
        return error(req, res, 400, 'Las fechas deben tener un formato válido (YYYY-MM-DD)');
    }
    if (new Date(fecha_inicio) > new Date(fecha_fin)) {
        return error(req, res, 400, 'La fecha de inicio no puede ser mayor que la fecha de fin');
    }

    try {
        const [respuesta] = await poolBetrost.query(
            `CALL sp_consultar_movimientos(?, ?, ?);`,
            [parseInt(id_bodega), fecha_inicio, fecha_fin]
        );
        if (respuesta[0] && respuesta[0].length > 0) {
            success(req, res, 200, respuesta[0]);
        } else {
            error(req, res, 404, 'No se encontraron movimientos para los criterios especificados');
        }
    } catch (error) {
        console.error('Error al consultar movimientos:', error);
        error(req, res, 500, 'Error interno del servidor al consultar movimientos');
    }
};

// Función auxiliar para validar formato de fecha
const isValidDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};


const iniciar_sesion_escaneo = async (req, res) => {
    const { id_bodega, id_usuario, observaciones } = req.body;

    // Validar parámetros de entrada
    if (!id_bodega || isNaN(id_bodega) || id_bodega <= 0) {
        return error(req, res, 400, 'El ID de la bodega debe ser un número entero positivo');
    }
    if (!id_usuario || isNaN(id_usuario) || id_usuario <= 0) {
        return error(req, res, 400, 'El ID del usuario debe ser un número entero positivo');
    }
    if (observaciones && typeof observaciones !== 'string') {
        return error(req, res, 400, 'Las observaciones deben ser una cadena de texto');
    }

    try {
        const [result] = await poolBetrost.query(
            `CALL sp_iniciar_sesion_escaneo(?, ?, ?, @p_id_sesion, @p_mensaje);`,
            [parseInt(id_bodega), parseInt(id_usuario), observaciones || null]
        );

        // Obtener los parámetros de salida
        const [output] = await poolBetrost.query(
            `SELECT @p_id_sesion AS id_sesion, @p_mensaje AS mensaje`
        );

        const { id_sesion, mensaje } = output[0];

        if (id_sesion > 0) {
            success(req, res, 200, { id_sesion, mensaje });
        } else {
            error(req, res, 400, mensaje);
        }
    } catch (error) {
        console.error('Error al iniciar sesión de escaneo:', error);
        error(req, res, 500, 'Error interno del servidor al iniciar sesión de escaneo');
    }
};

const agregar_producto_sesion = async (req, res) => {
    const { id_sesion, codigo_producto, cantidad } = req.body;

    // Validate input parameters
    if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
        return error(req, res, 400, 'El ID de la sesión debe ser un número entero positivo');
    }
    if (!codigo_producto || typeof codigo_producto !== 'string' || codigo_producto.trim() === '') {
        return error(req, res, 400, 'El código del producto debe ser una cadena no vacía');
    }
    if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
        return error(req, res, 400, 'La cantidad debe ser un número entero positivo');
    }

    try {
        const [result] = await poolBetrost.query(
            `CALL sp_agregar_producto_sesion(?, ?, ?, @p_mensaje);`,
            [parseInt(id_sesion), codigo_producto.trim(), parseInt(cantidad)]
        );

        // Retrieve the output parameter
        const [output] = await poolBetrost.query(
            `SELECT @p_mensaje AS mensaje`
        );

        const { mensaje } = output[0];

        if (mensaje === 'Producto agregado correctamente') {
            success(req, res, 200, { mensaje });
        } else {
            error(req, res, 400, mensaje);
        }
    } catch (error) {
        console.error('Error al agregar producto a la sesión:', error);
        error(req, res, 500, 'Error interno del servidor al agregar producto a la sesión');
    }
};

const obtener_detalle_sesion = async (req, res) => {
    const { id_sesion } = req.body;

    // Validate input parameter
    if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
        return error(req, res, 400, 'El ID de la sesión debe ser un número entero positivo');
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
            return error(req, res, 404, 'No se encontró la sesión especificada');
        }

        // Return both the session summary and product details
        success(req, res, 200, {
            sesion,
            detalles
        });
    } catch (error) {
        console.error('Error al obtener detalle de la sesión:', error);
        error(req, res, 500, 'Error interno del servidor al obtener detalle de la sesión');
    }
};

const cancelar_sesion_escaneo = async (req, res) => {
    const { id_sesion } = req.body;

    // Validate input parameter
    if (!id_sesion || isNaN(id_sesion) || id_sesion <= 0) {
        return error(req, res, 400, 'El ID de la sesión debe ser un número entero positivo');
    }

    try {
        const [result] = await poolBetrost.query(
            `CALL sp_cancelar_sesion_escaneo(?, @p_mensaje);`,
            [parseInt(id_sesion)]
        );

        // Retrieve the output parameter
        const [output] = await poolBetrost.query(
            `SELECT @p_mensaje AS mensaje`
        );

        const { mensaje } = output[0];

        if (mensaje === 'Sesión cancelada correctamente') {
            success(req, res, 200, { mensaje });
        } else {
            error(req, res, 400, mensaje);
        }
    } catch (error) {
        console.error('Error al cancelar sesión de escaneo:', error);
        error(req, res, 500, 'Error interno del servidor al cancelar sesión de escaneo');
    }
};

const finalizarSesionEscaneo = async (req, res) => {
  const { id_sesion } = req.body;

  if (!id_sesion) {
    return res.status(400).json({ error: 'El id_sesion es requerido' });
  }

  try {
    const connection = await poolBetrost.getConnection();

    try {
      // Declarar la variable de salida
      const [_, result] = await connection.query(`
        CALL sp_finalizar_sesion_escaneo(?, @mensaje);
        SELECT @mensaje AS mensaje;
      `, [id_sesion]);

      const mensaje = result[1][0].mensaje;

      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al finalizar sesión:', error);
    res.status(500).json({ error: 'Error al finalizar la sesión de escaneo' });
  }
};

const transferirProducto = async (req, res) => {
  const {
    id_bodega_origen,
    id_bodega_destino,
    codigo_producto,
    cantidad,
    id_usuario,
    observaciones
  } = req.body;

  // Validación básica
  if (!id_bodega_origen || !id_bodega_destino || !codigo_producto || !cantidad || !id_usuario) {
    return res.status(400).json({ error: 'Faltan campos requeridos para la transferencia' });
  }

  try {
    const connection = await poolBetrost.getConnection();
    try {
      const [_, result] = await connection.query(`
        CALL sp_transferir_productos(?, ?, ?, ?, ?, ?, @mensaje);
        SELECT @mensaje AS mensaje;
      `, [
        id_bodega_origen,
        id_bodega_destino,
        codigo_producto,
        cantidad,
        id_usuario,
        observaciones || '' // Por si viene null
      ]);

      const mensaje = result[1][0].mensaje;

      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al transferir producto:', error);
    res.status(500).json({ error: 'Error interno al realizar la transferencia' });
  }
};


const ajustarInventario = async (req, res) => {
  const {
    id_bodega,
    codigo_producto,
    nueva_cantidad,
    id_usuario,
    motivo
  } = req.body;

  if (!id_bodega || !codigo_producto || nueva_cantidad === undefined || !id_usuario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const connection = await poolBetrost.getConnection();
    try {
      const [_, result] = await connection.query(`
        CALL sp_ajustar_inventario(?, ?, ?, ?, ?, @mensaje);
        SELECT @mensaje AS mensaje;
      `, [
        id_bodega,
        codigo_producto,
        nueva_cantidad,
        id_usuario,
        motivo || ''
      ]);

      const mensaje = result[1][0].mensaje;
      res.status(200).json({ mensaje });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al ajustar inventario:', error);
    res.status(500).json({ error: 'Error interno al ajustar inventario' });
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
    ajustarInventario
}