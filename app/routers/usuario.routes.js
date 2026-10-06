import { Router } from 'express';
import { eliminar, insertarusuario, login, modificar, mostar, obtenerUsuarioPorId, } from '../controllers/controller.usuario';
import { verifyToken, verifyAdministrador } from '../middleware/oauth';
import { limiterLogin } from '../middleware/rateLimit';

const rutausaurio = Router();


// rutas de la base de datos betrost
rutausaurio.post("/loginusuario", limiterLogin, login); 
rutausaurio.get("/verificar", verifyToken, (req, res) => {
    res.status(200).json({
        success: true,
        usuario: req.user,
    });
});
rutausaurio.post("/insertarusuario", verifyToken, verifyAdministrador, insertarusuario);
rutausaurio.put("/modificar", verifyToken, verifyAdministrador, modificar); 
rutausaurio.delete("/eliminar", verifyToken, verifyAdministrador, eliminar);
rutausaurio.get("/mostrar", verifyToken, verifyAdministrador, mostar);
rutausaurio.get("/usuarios/:id", verifyToken, verifyAdministrador, obtenerUsuarioPorId);


export default rutausaurio;