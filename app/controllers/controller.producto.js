import pool from "../config/mysql.db";
import {success, error} from "../messages/browser";
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
    const { id_producto } = req.body;

    if (!id_producto) {
        return error(req, res, 400, "Falta el ID del producto");
    }

    try {
        await pool.query(`CALL SP_ELIMINAR_PRODUCTOS(${id_producto})`);
        success(req, res, 200, "Producto eliminado correctamente");
    } catch (err) {
        error(req, res, 500, err);
    }
}



export {mostarProductos, regproducto, eliminarProducto};