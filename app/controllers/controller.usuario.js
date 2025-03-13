import pool from "../config/mysql.db";
import bcrypt, {hash} from "bcrypt";
import {success, error} from "../messages/browser";
import { config } from "dotenv";
import jwt from "jsonwebtoken"; 

config();



const mostarUsuarios = async (req, res) => {
    try{
        const [respuesta] = await pool.query(`CALL SP_MOSTRAR_USUARIOS();`);
        success(req, res, 200, respuesta[0]);
        
    } catch (err){
        error(req, res, 500, err);
    }
};



const crearUsuario = async (req, res) => {
    const { nombre, descripcion, bodega, rol} = req.body;
    const contrasenasincifrar = req.body.contrasena;


    if (!nombre ||  !contrasenasincifrar || !descripcion || !bodega || !rol ) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {
        const hash = await bcrypt.hash(contrasenasincifrar, 10); 
        const contrasena = hash;

        const respuesta = await pool.query(`CALL SP_INSERTAR_USUARIO("${nombre}" , "${contrasena}", "${descripcion}", "${bodega}", "${rol}");`);

        if (respuesta[0].affectedRows === 1) {
            success(req, res, 201, "Usuario creado correctamente");
        } else {
            error(req, res, 400, "No se pudo crear el usuario");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
};


const modificarUsuario = async (req, res) => {
    const {nombre, descripcion, bodega} = req.body;


    if (!nombre  || !descripcion || !bodega) {
        return error(req, res, 400, "Todos los campos son obligatorios");
    }

    try {

        const respuesta = await pool.query(`CALL SP_MODIFICAR_USUARIO("${nombre}", "${descripcion}", "${bodega}");`);

        if (respuesta[0].affectedRows == 1) {
            
            success(req, res, 201, "Usuario modificado correctamente");
        } else {
            error(req, res, 400, "No se pudo modificar el usuario");
        }
    } catch (err) {
        error(req, res, 500, err.message);
    }
};


const eliminarUsuario = async (req, res) => {
    const {id_usuario} = req.body;
    try {
        const respuesta = await pool.query(`CALL SP_ELIMINAR_USUARIO("${id_usuario}");`);
        if (respuesta[0].affectedRows == 1){
            success(req, res, 200, "Usuario eliminado correctamente");
        } else {
            error(req, res, 400, "No se pudo eliminar el usuario");
        }
    } catch (err) {
        error(req, res, 400, err);
    }
};


const loginusuario = async (req, res) => {
    const { nombre, contrasena } = req.body;

    try {
        // Llamar al procedimiento almacenado
        const [rows] = await pool.query(`CALL SP_LOGIN_USUARIO(?);`, [nombre]);

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
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                rol: usuario.rol,
                bodega: usuario.bodega, // Incluir la bodega en el payload del token
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
                nombre: usuario.nombre,
                rol: usuario.rol,
                bodega: usuario.bodega, // Incluir la bodega en la respuesta
            },
        });
    } catch (e) {
        console.error("Error en loginusuario:", e);
        error(req, res, 500, "Error en el servidor, por favor intente de nuevo.");
    }
};




export {mostarUsuarios, crearUsuario, modificarUsuario, eliminarUsuario, loginusuario};