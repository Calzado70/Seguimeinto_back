import { Router } from "express";


const rutaProducto = Router();

rutaProducto.get("/producto");
rutaProducto.post("/producto");
rutaProducto.delete("/producto");
rutaProducto.post("/registrar");
rutaProducto.get("/historial");
rutaProducto.get("/movimientos/:id_producto");
rutaProducto.put("/actualizar");


export default rutaProducto;