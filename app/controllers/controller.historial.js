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

export { mostrarHistorial };