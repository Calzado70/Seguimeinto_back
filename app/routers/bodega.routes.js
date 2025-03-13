import { Router } from 'express';
import { crearBodega, eliminarBodega, modificarBodega, mostrarBodegas } from '../controllers/controller.bodega';

const rutaBodega = Router();

rutaBodega.get("/bodega", mostrarBodegas);
rutaBodega.post("/bodega", crearBodega);
rutaBodega.put("/bodega", modificarBodega);
rutaBodega.delete("/bodega", eliminarBodega);


export default rutaBodega;