import pool from "../config/mysql.db";
import { poolBetrost } from "../config/mysql.db";
import {success, error} from "../messages/browser";
import { config } from "dotenv";
config();


const mostrarBodegas = async (req, res) => {
    try{
        const [respuesta] = await pool.query(`CALL SP_MOSTRAR_BODEGAS();`);
        success(req, res, 200, respuesta[0]);
        
    } catch (err){
        error(req, res, 500, err);
    }
}

const crearBodega = async (req, res) => {
    const { nombre, capacidad } = req.body;

    if (!nombre || !capacidad) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await pool.query(`CALL SP_INSERTAR_BODEGAS("${nombre}", "${capacidad}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Bodega creada correctamente");
        } else {
            error(req, res, 400, "No se pudo crear la bodega");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
}

const modificarBodega = async (req, res) => {
    const {id_bodega, nombre, capacidad} = req.body;

    if ( !id_bodega ||!nombre || !capacidad) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await pool.query(`CALL SP_MODIFICAR_BODEGAS("${id_bodega}", "${nombre}", "${capacidad}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Bodega modificada correctamente");
        } else {
            error(req, res, 400, "No se pudo modificar la bodega");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
}

const eliminarBodega = async (req, res) => {
    const {id_bodega} = req.body;

    if (!id_bodega) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await pool.query(`CALL SP_ELIMINAR_BODEGAS("${id_bodega}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Bodega eliminada correctamente");
        } else {
            error(req, res, 400, "No se pudo eliminar la bodega");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
}


//-----------------------------------   BASE DE DATOS DE BETROST    --------------------------------------------
//  ESTA BASE DE DATOS ES LA NUEVA ESTRUCTURA PARA MANEJAR QUE LAS BODEGAS PUEDAN CONCUMIR DE UNA A OTRA


const mostrar = async (req, res) => {
    try {
        const [respuesta] = await poolBetrost.query(`CALL betrost.sp_mostrar_bodega();`);
        
        // Asegurar formato consistente
        res.status(200).json({
            success: true,
            data: respuesta[0] || []  // Devuelve array vacío si no hay datos
        });
        
    } catch (error) {
        console.error('Error en mostrar bodegas:', error);
        res.status(500).json({
            success: false,
            message: "Error al obtener bodegas",
            error: error.message
        });
    }
}


const crear = async (req, res) => {
    const { nombre, capacidad, estado } = req.body;

    if (!nombre || !capacidad || !estado) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await poolBetrost.query(`CALL betrost.sp_crear_bodegas("${nombre}", "${capacidad}", "${estado}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Bodega creada correctamente");
        } else {
            error(req, res, 400, "No se pudo crear la bodega");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
}

const modificar = async (req, res) => {
    const {id_bodega, nombre, capacidad, estado} = req.body;

    if ( !id_bodega ||!nombre || !capacidad || !estado) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await poolBetrost.query(`CALL betrost.sp_modificar_bodega("${id_bodega}", "${nombre}", "${capacidad}", "${estado}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Bodega modificada correctamente");
        } else {
            error(req, res, 400, "No se pudo modificar la bodega");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
}

const eliminar = async (req, res) => {
    const {id_bodega} = req.body;

    if (!id_bodega) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const respuesta = await poolBetrost.query(`CALL betrost.sp_eliminar_bodega("${id_bodega}");`);

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
    mostrarBodegas, 
    crearBodega, 
    modificarBodega, 
    eliminarBodega,
    mostrar,
    crear,
    modificar,
    eliminar
};