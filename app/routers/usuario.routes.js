import { Router } from 'express';
import { eliminar, insertarusuario, login, modificar, mostar, } from '../controllers/controller.usuario';
import { verifyToken } from '../middleware/oauth';



const rutausaurio = Router();


// rutas de la base de datos betrost
rutausaurio.post("/insertarusuario", insertarusuario);
rutausaurio.post("/loginusuario", login); 
rutausaurio.put("/modificar", modificar); 
rutausaurio.delete("/eliminar", eliminar);
rutausaurio.get("/mostrar", mostar);


export default rutausaurio;