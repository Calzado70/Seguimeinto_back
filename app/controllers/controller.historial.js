import poolBetrost from "../config/mysql.db";
import { success, error } from "../messages/browser.js";
import { config } from "dotenv";
config();

const consultarHistorial = async (req, res) => {
    try {
        const [ respuesta ] = await poolBetrost.query(`CALL sp_consultar_historial_movimientos();`);
        success(req, res, 200, respuesta[0]);
    } catch (err) {
        error(req, res, 500, err);
    }
}


export { 
    consultarHistorial
}