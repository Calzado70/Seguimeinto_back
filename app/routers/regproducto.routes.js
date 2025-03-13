import { Router } from "express";
import { mostarProductos, regproducto } from "../controllers/controller.producto";


const rutaProducto = Router();

rutaProducto.get("/producto", mostarProductos);
rutaProducto.post("/producto", regproducto);


export default rutaProducto;