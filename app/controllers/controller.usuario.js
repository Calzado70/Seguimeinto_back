import poolBetrost from "../config/mysql.db";
import bcrypt, {hash} from "bcrypt";
import {success, error} from "../messages/browser";
import { config } from "dotenv";
import jwt from "jsonwebtoken"; 

config();

//-----------------------------------   BASE DE DATOS DE BETROST    --------------------------------------------
//  ESTA BASE DE DATOS ES LA NUEVA ESTRUCTURA PARA MANEJAR QUE LAS BODEGAS PUEDAN CONCUMIR DE UNA A OTRA

const mostar = async (req, res) => {
    try{
        const [respuesta] = await poolBetrost.query(`CALL sp_consulta_usuarios();`);
        success(req, res, 200, respuesta[0]);
        
    } catch (err){
        error(req, res, 500, err);
    }
};

const obtenerUsuarioPorId = async (req, res) => {
  const { id_usuario } = req.body;

  try {
    const rows = await poolBetrost.query(`CALL sp_mostrar_usuario_id(?);`,
      [id_usuario]
    );
    success(req, res, 200, rows[0][0]);
  } catch (error) {
    console.error("Error al buscar usuario:", error);
    error(req, res, 500, "Error al buscar usuario");
    }
};


const eliminar = async (req, res) => {
    const {id_usuario} = req.body;
    try {
        const respuesta = await poolBetrost.query(`CALL sp_eliminar_usuario("${id_usuario}");`);
        if (respuesta[0].affectedRows == 1){
            success(req, res, 200, "Usuario eliminado correctamente");
        } else {
            error(req, res, 400, "No se pudo eliminar el usuario");
        }
    } catch (err) {
        error(req, res, 400, err);
    }
};

const modificar = async (req, res) => {
    const {id_bodega, nombre, contrasena} = req.body;

    if (!id_bodega || !nombre || !contrasena) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const hash = await bcrypt.hash(contrasena, 10);

        const respuesta = await poolBetrost.query(
            `CALL sp_modificar_usuario(?, ?, ?)`, 
            [id_bodega, nombre, hash]
        );

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 200, "Usuario modificado correctamente");
        } else {
            error(req, res, 400, "No se pudo modificar el usuario");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
};

const login = async (req, res) => {
    const { nombre, contrasena } = req.body;

    try {
        // Llamar al procedimiento almacenado
        const [rows] = await poolBetrost.query(`CALL sp_login(?);`, [nombre]);

        if (rows[0].length === 0) {
            return error(req, res, 404, "El usuario no existe.");
        }

        const usuario = rows[0][0]; // Acceder al primer resultado del procedimiento almacenado

        // Comparar la contraseña proporcionada con la contraseña cifrada
        const match = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!match) {
            return error(req, res, 401, "Contraseña incorrecta.");
        }

        // Generar un token JWT con la información del usuario y la bodega
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                id_bodega: usuario.id_bodega,
                nombre_bodega: usuario.nombre_bodega,
                nombre: usuario.nombre,
                rol: usuario.rol,
            },
            process.env.TOKEN_PRIVATEKEY, // Clave secreta
            { expiresIn: process.env.TOKEN_EXPIRES_IN } // Expiración del token
        );

        // Devolver una respuesta exitosa con el token y la información del usuario
        res.status(200).json({
            message: "Bienvenido",
            token: token,
            usuario: {
                id_usuario: usuario.id_usuario,
                id_bodega: usuario.id_bodega,
                nombre_bodega: usuario.nombre_bodega,
                nombre: usuario.nombre,
                rol: usuario.rol,
            },
        });
    } catch (e) {
        console.error("Error en loginusuario:", e);
        error(req, res, 500, "Error en el servidor, por favor intente de nuevo.");
    }
};

const insertarusuario = async (req, res) => {
    const { id_bodega, nombre, correo, contrasena, rol, estado } = req.body;

    try {
        const hash = await bcrypt.hash(contrasena, 10);

        // Llamada al procedimiento almacenado
        const [result] = await poolBetrost.query(
            `CALL sp_insertar_usuario(?, ?, ?, ?, ?, ?)`, 
            [id_bodega, nombre, correo, hash, rol, estado]
        );

        // Verificación mejorada del resultado
        if (result && result[0] && result[0][0] && result[0][0].affected_rows > 0) {
            return res.status(201).json({
                success: true,
                message: "Usuario creado correctamente",
                body: result[0][0] // Envía información adicional si es necesario
            });
        }

        return res.status(400).json({
            success: false,
            message: "No se pudo crear el usuario",
            details: result // Para depuración
        });
        
    } catch (err) {
        console.error("Error en insertarusuario:", err);
        return res.status(500).json({
            success: false,
            message: "Error en el servidor",
            error: err.message
        });
    }
};




export {
    insertarusuario, 
    login, 
    modificar,
    eliminar,
    mostar,
    obtenerUsuarioPorId
};