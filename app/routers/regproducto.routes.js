import { Router } from "express";
import { eliminarProducto, mostarProductos, regproducto } from "../controllers/controller.producto";


const rutaProducto = Router();

rutaProducto.get("/producto", mostarProductos);
rutaProducto.post("/producto", regproducto);
rutaProducto.delete("/producto", eliminarProducto);


export default rutaProducto;