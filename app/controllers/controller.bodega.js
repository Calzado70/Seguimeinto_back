import pool from "../config/mysql.db";
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


export {mostrarBodegas, crearBodega, modificarBodega, eliminarBodega};