import poolBetrost from "../config/mysql.db";
import { success, error } from "../messages/browser";
import { recortarFila, registrarAuditoria } from "../utils/auditoria";
import { config } from "dotenv";
config();

const listar = async (req, res) => {
    try {
        const { soloActivas } = req.query;
        const [respuesta] = await poolBetrost.query(
            `SELECT id, valor, estado FROM caracteristicas ORDER BY valor`
        );
        const data = respuesta;
        if (soloActivas === "true" || soloActivas === "1") {
            return success(req, res, 200, data.filter((c) => c.estado === "ACTIVA"));
        }
        success(req, res, 200, data);
    } catch (err) {
        error(req, res, 500, err);
    }
};

const crear = async (req, res) => {
    const { valor } = req.body;

    if (!valor || valor.trim() === "") {
        return error(req, res, 400, "El valor de la característica es obligatorio");
    }

    const valorNormalizado = valor.trim().toUpperCase();

    try {
        const [respuesta] = await poolBetrost.query(
            `INSERT INTO caracteristicas (valor, estado) VALUES (?, 'ACTIVA')`,
            [valorNormalizado]
        );

        if (respuesta.affectedRows === 1) {
            await registrarAuditoria(poolBetrost, req, {
                tabla: "caracteristicas",
                accion: "CREAR",
                id_registro: respuesta.insertId ?? null,
                datos_despues: { valor: valorNormalizado, estado: "ACTIVA" },
            });

            return success(
                req,
                res,
                201,
                { id: respuesta.insertId, valor: valorNormalizado },
                "Característica creada correctamente"
            );
        }
        error(req, res, 400, "No se pudo crear la característica");
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return error(req, res, 400, "Ya existe una característica con ese valor");
        }
        error(req, res, 500, err);
    }
};

const modificar = async (req, res) => {
    const { id, valor, estado } = req.body;

    if (!id || !valor || !estado) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    const valorNormalizado = valor.trim().toUpperCase();

    try {
        const [previo] = await poolBetrost.query(
            `SELECT valor, estado FROM caracteristicas WHERE id = ?`,
            [id]
        );

        const [respuesta] = await poolBetrost.query(
            `UPDATE caracteristicas SET valor = ?, estado = ? WHERE id = ?`,
            [valorNormalizado, estado, id]
        );

        if (respuesta.affectedRows === 1) {
            await registrarAuditoria(poolBetrost, req, {
                tabla: "caracteristicas",
                accion: "MODIFICAR",
                id_registro: id,
                datos_antes: recortarFila(previo[0], ["valor", "estado"]),
                datos_despues: { valor: valorNormalizado, estado },
            });

            return success(req, res, 200, null, "Característica modificada correctamente");
        }
        error(req, res, 400, "No se pudo modificar la característica");
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return error(req, res, 400, "Ya existe una característica con ese valor");
        }
        error(req, res, 500, err);
    }
};

const eliminar = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return error(req, res, 400, "El id es obligatorio");
    }

    try {
        const [previo] = await poolBetrost.query(
            `SELECT valor, estado FROM caracteristicas WHERE id = ?`,
            [id]
        );

        const [respuesta] = await poolBetrost.query(
            `DELETE FROM caracteristicas WHERE id = ?`,
            [id]
        );

        if (respuesta.affectedRows === 1) {
            await registrarAuditoria(poolBetrost, req, {
                tabla: "caracteristicas",
                accion: "ELIMINAR",
                id_registro: id,
                datos_antes: recortarFila(previo[0], ["valor", "estado"]),
            });

            return success(req, res, 200, null, "Característica eliminada correctamente");
        }
        error(req, res, 400, "No se pudo eliminar la característica");
    } catch (err) {
        error(req, res, 500, err);
    }
};

export { listar, crear, modificar, eliminar };