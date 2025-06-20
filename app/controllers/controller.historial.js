import pool from "../config/mysql.db";
import { success, error } from "../messages/browser";
import { config } from "dotenv";
config();

const mostrarHistorial = async (req, res) => {
    const { id_bodega, fecha_inicio, fecha_fin } = req.query;

    try {
        const [respuesta] = await pool.query(`CALL SP_MOSTRAR_HISTORIAL(?, ?, ?);`, [
            id_bodega ? parseInt(id_bodega) : null,
            fecha_inicio || null,
            fecha_fin || null
        ]);
        success(req, res, 200, respuesta[0]);
    } catch (err) {
        error(req, res, 500, err);
    }
};

const mostrarHistorialEnviado = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    // console.log('Ejecutando mostrarHistorialEnviado con parámetros:', { fecha_inicio, fecha_fin }); // Debug log

    try {
        const [respuesta] = await pool.query(`CALL SP_MOSTRAR_HISTORIAL_ENVIADO(?, ?);`, [
            fecha_inicio || null,
            fecha_fin || null
        ]);
        // console.log('Resultado de la consulta:', respuesta[0]); // Debug log
        success(req, res, 200, respuesta[0]);
    } catch (err) {
        console.error('Error en mostrarHistorialEnviado:', err);
        error(req, res, 500, err);
    }
};

export { mostrarHistorial, mostrarHistorialEnviado };