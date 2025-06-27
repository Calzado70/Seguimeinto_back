import { Router } from 'express';
import { crear, crearBodega, eliminar, eliminarBodega, modificar, modificarBodega, mostrar, mostrarBodegas } from '../controllers/controller.bodega';
import ruta from '.';

const rutaBodega = Router();

rutaBodega.get("/bodega", mostrarBodegas);
rutaBodega.post("/bodega", crearBodega);
rutaBodega.put("/bodega", modificarBodega);
rutaBodega.delete("/bodega", eliminarBodega);


// rutas de la base de datos betrost
rutaBodega.get("/mostrar", mostrar);
rutaBodega.post("/crear", crear);
rutaBodega.put("/modificar", modificar);
rutaBodega.delete("/eliminar", eliminar);


export default rutaBodega;