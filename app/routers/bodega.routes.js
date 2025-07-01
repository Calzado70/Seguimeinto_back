import { Router } from 'express';
import { crear, eliminar, modificar,mostrar } from '../controllers/controller.bodega';

const rutaBodega = Router();


// rutas de la base de datos betrost
rutaBodega.get("/mostrar", mostrar);
rutaBodega.post("/crear", crear);
rutaBodega.put("/modificar", modificar);
rutaBodega.delete("/eliminar", eliminar);


export default rutaBodega;