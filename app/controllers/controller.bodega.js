import poolBetrost from "../config/mysql.db";
import {success, error} from "../messages/browser";
import { config } from "dotenv";
config();

//-----------------------------------   BASE DE DATOS DE BETROST    --------------------------------------------
//  ESTA BASE DE DATOS ES LA NUEVA ESTRUCTURA PARA MANEJAR QUE LAS BODEGAS PUEDAN CONCUMIR DE UNA A OTRA


const mostrar = async (req, res) => {
    try {
        const { id } = req.query;
        
        let query;
        let params = [];
        
        if (id) {
            query = `CALL sp_mostrar_bodega_por_id(?)`;
            params = [id];
        } else {
            query = `CALL sp_mostrar_bodega()`;
        }

        const [respuesta] = await poolBetrost.query(query, params);
        
        // Verificar si se obtuvieron resultados
        if (!respuesta || !respuesta[0]) {
            return res.status(404).json({
                success: false,
                message: id ? 'Bodega no encontrada' : 'No hay bodegas registradas'
            });
        }

        res.status(200).json({
            success: true,
            data: respuesta[0]
        });
        
    } catch (err) {
        console.error("Error en mostrar bodegas:", err);
        res.status(500).json({
            success: false,
            message: "Error al obtener bodegas",
            error: err.message,
            sqlMessage: err.sqlMessage // Para depuración
        });
    }
};

const crear = async (req, res) => {
    const { nombre, capacidad, estado = 'ACTIVA' } = req.body; // Cambiado a 'ACTIVA'

    // Validación mejorada
    if (!nombre || !capacidad) {
        return res.status(400).json({
            success: false,
            message: "Nombre y capacidad son obligatorios"
        });
    }

    if (typeof capacidad !== 'number' || capacidad <= 0) {
        return res.status(400).json({
            success: false,
            message: "Capacidad debe ser un número positivo"
        });
    }

    try {
        const [respuesta] = await poolBetrost.query(
            `CALL sp_crear_bodegas(?, ?, ?)`, 
            [nombre, capacidad, estado]
        );

        // Ajuste para manejar correctamente la respuesta del procedimiento
        if (respuesta.affectedRows === 1) {
            return res.status(201).json({
                success: true,
                message: "Bodega creada correctamente",
                data: {
                    id_bodega: respuesta.insertId,
                    nombre,
                    capacidad,
                    estado
                }
            });
        }
        
        return res.status(400).json({
            success: false,
            message: "No se pudo crear la bodega"
        });
    } catch (err) {
        console.error("Error al crear bodega:", err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Ya existe una bodega con ese nombre"
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Error en el servidor",
            error: err.message
        });
    }
};

const modificar = async (req, res) => {
    const { id_bodega, nombre, capacidad, estado } = req.body;

    if (!id_bodega || !nombre || !capacidad || !estado) {
        return res.status(400).json({
            success: false,
            message: "Todos los campos son obligatorios"
        });
    }

    if (typeof capacidad !== 'number' || capacidad <= 0) {
        return res.status(400).json({
            success: false,
            message: "Capacidad debe ser un número positivo"
        });
    }

    try {
        const [respuesta] = await poolBetrost.query(
            `CALL sp_modificar_bodega(?, ?, ?, ?)`, 
            [id_bodega, nombre, capacidad, estado]
        );

        if (respuesta.affectedRows === 1) {
            return res.status(200).json({
                success: true,
                message: "Bodega modificada correctamente",
                data: {
                    id_bodega,
                    nombre,
                    capacidad,
                    estado
                }
            });
        }
        
        return res.status(400).json({
            success: false,
            message: "No se pudo modificar la bodega"
        });
    } catch (err) {
        console.error("Error al modificar bodega:", err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Ya existe una bodega con ese nombre"
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Error en el servidor",
            error: err.message
        });
    }
}

const eliminar = async (req, res) => {
    const {id_bodega} = req.body;

    if (!id_bodega) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await poolBetrost.query(`CALL sp_eliminar_bodega("${id_bodega}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Bodega eliminada correctamente");
        } else {
            error(req, res, 400, "No se pudo eliminar la bodega");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
}

export {
    mostrar,
    crear,
    modificar,
    eliminar
};