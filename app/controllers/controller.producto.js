import pool from "../config/mysql.db";
import {success, error} from "../messages/browser";
import bcrypt from "bcrypt";
import { config } from "dotenv";


config();


const mostarProductos = async (req, res) => {
    const { id_bodega } = req.query;
    try {
        const [respuesta] = await pool.query(`CALL SP_MOSTRAR_PRODUCTO(${id_bodega});`);
        success(req, res, 200, respuesta[0]);
    } catch (err) {
        error(req, res, 500, err);
    }
};


const regproducto = async (req, res) => {
    const { id_bodega, idusuario, productos } = req.body;

    if (!id_bodega || !idusuario || !productos || !Array.isArray(productos)) {
        return error(req, res, 400, "Datos incompletos o incorrectos");
    }

    try {
        // Insertar cada producto en la base de datos
        for (const producto of productos) {
            const { codigo, cantidad } = producto;
            await pool.query(
                `CALL SP_INSERTAR_PRODUCTOS(?, ?, ?, ?, ?)`,
                [id_bodega, idusuario, codigo, "En proceso", cantidad] // Estado por defecto: "En proceso"
            );
        }

        success(req, res, 201, "Productos registrados correctamente");
    } catch (err) {
        console.error("Error en regproducto:", err);
        error(req, res, 500, "Error al registrar los productos");
    }
};

const eliminarProducto = async (req, res) => {
    const { id_producto, contrasena } = req.body;

    if (!id_producto || !contrasena) {
        return error(req, res, 400, "Falta el ID del producto o la contraseña");
    }

    try {
        // 1. Obtener el ID del usuario desde el token
        const token = req.headers.authorization.split(' ')[1];
        const payload = JSON.parse(atob(token.split('.')[1]));
        const id_usuario = payload.id;

        // 2. Buscar el usuario en la base de datos para obtener su contraseña cifrada
        const [usuario] = await pool.query(
            'SELECT contrasena FROM usuarios WHERE id_usuario = ?', 
            [id_usuario]
        );

        if (!usuario || usuario.length === 0) {
            return error(req, res, 404, "Usuario no encontrado");
        }

        // 3. Comparar la contraseña ingresada con la almacenada (usando bcrypt)
        const contrasenaValida = await bcrypt.compare(contrasena, usuario[0].contrasena);

        if (!contrasenaValida) {
            return error(req, res, 401, "Contraseña incorrecta");
        }

        // 4. Si la contraseña es válida, eliminar el producto
        await pool.query('CALL SP_ELIMINAR_PRODUCTOS(?)', [id_producto]);
        success(req, res, 200, "Producto eliminado correctamente");

    } catch (err) {
        console.error("Error en eliminarProducto:", err);
        error(req, res, 500, "Error al eliminar el producto");
    }
};



const registrarMovimientos = async (req, res) => {
    const { movimientos } = req.body;
    
    if (!movimientos || !Array.isArray(movimientos) || movimientos.length === 0) {
        return error(req, res, 400, "Debe proporcionar al menos un movimiento");
    }

    try {
        const resultados = [];
        
        for (const movimiento of movimientos) {
            const {
                id_producto,
                id_bodega_origen,
                id_bodega_destino,
                usuario_responsable,
                tipo_movimiento,
                observaciones
            } = movimiento;
            
            console.log('Procesando movimiento:', { id_producto, id_bodega_origen, id_bodega_destino, usuario_responsable, tipo_movimiento, observaciones }); // Detailed log
            
            if (!id_producto || !id_bodega_origen || !id_bodega_destino || !usuario_responsable || !tipo_movimiento) {
                resultados.push({
                    id_producto,
                    success: false,
                    message: 'Faltan campos requeridos'
                });
                console.log(`Movimiento rechazado: Faltan campos requeridos para id_producto ${id_producto}`);
                continue;
            }
            
            if (id_bodega_origen === id_bodega_destino) {
                resultados.push({
                    id_producto,
                    success: false,
                    message: 'La bodega de origen y destino no pueden ser iguales'
                });
                console.log(`Movimiento rechazado: Bodegas iguales para id_producto ${id_producto}`);
                continue;
            }
            
            try {
                await pool.query(
                    'CALL SP_REGISTRAR_MOVIMIENTO(?, ?, ?, ?, ?, ?)',
                    [
                        id_producto,
                        id_bodega_origen,
                        id_bodega_destino,
                        usuario_responsable,
                        tipo_movimiento,
                        observaciones || ''
                    ]
                );
                
                resultados.push({
                    id_producto,
                    success: true,
                    message: 'Movimiento registrado correctamente'
                });
                console.log(`Movimiento exitoso para id_producto ${id_producto}`);
            } catch (err) {
                console.error(`Error al procesar movimiento para producto ${id_producto}:`, err);
                resultados.push({
                    id_producto,
                    success: false,
                    message: err.message || 'Error al registrar el movimiento'
                });
            }
        }
        
        const todosExitosos = resultados.every(resultado => resultado.success);
        const algunosExitosos = resultados.some(resultado => resultado.success);
        
        if (todosExitosos) {
            success(req, res, 200, {
                message: 'Todos los movimientos se registraron correctamente',
                data: resultados
            });
        } else if (algunosExitosos) {
            success(req, res, 207, {
                message: 'Algunos movimientos se registraron correctamente',
                data: resultados
            });
        } else {
            error(req, res, 400, {
                message: 'No se pudo registrar ningún movimiento',
                data: resultados
            });
        }
    } catch (err) {
        console.error('Error en registrarMovimientos:', err);
        error(req, res, 500, "Error interno del servidor al registrar movimientos");
    }
};

const obtenerHistorialMovimientos = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        const params = [];
        let query = 'CALL SP_MOSTRAR_MOVIMIENTOS(?, ?)';

        params.push(fecha_inicio || null);
        params.push(fecha_fin || null);

        const [respuesta] = await pool.query(query, params);

        success(req, res, 200, respuesta[0]);
    } catch (err) {
        console.error('Error en obtenerHistorialMovimientos:', err);
        error(req, res, 500, "Error al obtener el historial de movimientos");
    }
};

const obtenerMovimientosPorProducto = async (req, res) => {
    try {
        const { id_producto } = req.params;
        
        if (!id_producto) {
            return error(req, res, 400, "ID del producto es requerido");
        }
        
        const query = `
            SELECT 
                m.id_movimiento,
                bo.nombre as bodega_origen,
                bd.nombre as bodega_destino,
                u.nombre as usuario_responsable,
                m.tipo_movimiento,
                m.observaciones,
                m.fecha_movimiento
            FROM movimientos m
            JOIN bodegas bo ON m.id_bodega_origen = bo.id_bodega
            JOIN bodegas bd ON m.id_bodega_destino = bd.id_bodega
            JOIN usuarios u ON m.usuario_responsable = u.id_usuario
            WHERE m.id_producto = ?
            ORDER BY m.fecha_movimiento DESC
        `;
        
        const [respuesta] = await pool.query(query, [id_producto]);
        success(req, res, 200, respuesta);
        
    } catch (err) {
        console.error('Error en obtenerMovimientosPorProducto:', err);
        error(req, res, 500, "Error al obtener los movimientos del producto");
    }
};



export {mostarProductos, regproducto, eliminarProducto, registrarMovimientos, obtenerHistorialMovimientos, obtenerMovimientosPorProducto};