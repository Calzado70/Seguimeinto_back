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



export {mostarProductos, regproducto, eliminarProducto};