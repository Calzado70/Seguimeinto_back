import { Router } from "express";
import { agregar_producto_sesion, ajustarInventario, cancelar_sesion_escaneo, consultar_inventario, consultar_movimientos, consultar_stock, finalizarSesionEscaneo, iniciar_sesion_escaneo, obtener_detalle_sesion, transferirProducto } from "../controllers/controller.producto";


const rutaProducto = Router();


// METODO GET -- CONSULTAS
rutaProducto.get("/inventario", consultar_inventario);
rutaProducto.get("/stock", consultar_stock);
rutaProducto.get("/movi", consultar_movimientos);
rutaProducto.get("/detalle", obtener_detalle_sesion);


// METODO POST -- CREAR
rutaProducto.post("/inicio", iniciar_sesion_escaneo);
rutaProducto.post("/agregar", agregar_producto_sesion);


// METODO PUT -- ACTUALIZAR
rutaProducto.put("/finalizar", finalizarSesionEscaneo);
rutaProducto.put("/transferencia", transferirProducto);
rutaProducto.put('/ajustar', ajustarInventario);


// METODO DELETE -- ELIMINAR
rutaProducto.delete("/cancelar", cancelar_sesion_escaneo);


export default rutaProducto;