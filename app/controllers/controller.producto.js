import pool from "../config/mysql.db";
import {success, error} from "../messages/browser";
import { config } from "dotenv";


config();


const mostarProductos = async (req, res) => {
    try{
        const [respuesta] = await pool.query(`CALL SP_MOSTRAR_PRODUCTO();`);
        success(req, res, 200, respuesta[0]);
        
    } catch (err){
        error(req, res, 500, err);
    }
}


const regproducto = async (req, res) => {
    try {
        const { id_bodega, idusuario, productos } = req.body;

        for (const producto of productos) {
            const { codigo, cantidad } = producto;
            const estado = 'EnBodega';
            await pool.query(`CALL SP_INSERTAR_PRODUCTOS("${id_bodega}", "${idusuario}", "${codigo}", "${estado}", "${cantidad}");`);
        }

        success(req, res, 200, { message: 'Productos registrados correctamente' });
    } catch (err) {
        error(req, res, 500, err);
    }
}



export {mostarProductos, regproducto};