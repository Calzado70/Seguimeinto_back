import { Router } from "express";
import { actualizarProducto, eliminarProducto, mostarProductos, obtenerHistorialMovimientos, registrarMovimientos, regproducto } from "../controllers/controller.producto";


const rutaProducto = Router();

rutaProducto.get("/producto", mostarProductos);
rutaProducto.post("/producto", regproducto);
rutaProducto.delete("/producto", eliminarProducto);
rutaProducto.post("/registrar", registrarMovimientos);
rutaProducto.get("/historial", obtenerHistorialMovimientos);
rutaProducto.get("/movimientos/:id_producto", obtenerHistorialMovimientos);
rutaProducto.put("/actualizar", actualizarProducto);


export default rutaProducto;