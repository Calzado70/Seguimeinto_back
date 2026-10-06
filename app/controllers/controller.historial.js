import poolBetrost from "../config/mysql.db";
import { success, error } from "../messages/browser.js";
import {
  contarFilas,
  enviarTotalCount,
  normalizarPaginacion,
} from "../utils/paginacion.js";
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

/**
 * Listado paginado de la auditoría de la Fase 4.3.
 *
 * Filtros: `tabla`, `accion`, `fecha_desde`, `fecha_hasta` y `usuario`
 * (búsqueda parcial sobre el nombre del actor). El usuario se guarda en
 * su propia columna además de como clave ajena, precisamente para poder
 * seguir mostrando el nombre cuando el usuario ya no existe.
 */
const consultarAuditoria = async (req, res) => {
    const { page, limit, offset } = normalizarPaginacion(req.query);

    const condiciones = [];
    const parametros = [];

    if (req.query.tabla) {
        condiciones.push("a.tabla = ?");
        parametros.push(req.query.tabla.trim());
    }

    if (req.query.accion) {
        condiciones.push("a.accion = ?");
        parametros.push(req.query.accion.trim());
    }

    if (req.query.usuario) {
        condiciones.push("a.usuario LIKE ?");
        parametros.push(`%${req.query.usuario.trim()}%`);
    }

    if (req.query.fecha_desde) {
        condiciones.push("a.fecha >= ?");
        parametros.push(req.query.fecha_desde.trim());
    }

    if (req.query.fecha_hasta) {
        // Se añade un día para que `hasta` sea inclusivo de la fecha entera.
        condiciones.push("a.fecha < DATE_ADD(?, INTERVAL 1 DAY)");
        parametros.push(req.query.fecha_hasta.trim());
    }

    const where = condiciones.length ? condiciones.join(" AND ") : "";

    try {
        const total = await contarFilas(poolBetrost, "auditoria a", where, parametros);

        const [filas] = await poolBetrost.query(
            `SELECT
  a.id_auditoria,
  a.tabla,
  a.accion,
  a.id_registro,
  a.id_usuario,
  a.usuario,
  a.ip,
  a.user_agent,
  a.datos_antes,
  a.datos_despues,
  a.fecha
FROM auditoria a
${where ? `WHERE ${where}` : ""}
ORDER BY a.id_auditoria DESC
LIMIT ? OFFSET ?`,
            [...parametros, limit, offset]
        );

        enviarTotalCount(res, total);

        return success(req, res, 200, filas);
    } catch (err) {
        console.error("Error consultando auditoría:", err);
        return error(req, res, 500, "Error consultando auditoría");
    }
}


export { 
    consultarHistorial,
    consultarAuditoria
}