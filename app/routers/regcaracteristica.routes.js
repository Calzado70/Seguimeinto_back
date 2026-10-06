import { Router } from "express";
import { listar, crear, modificar, eliminar } from "../controllers/controller.caracteristica";
import { verifyToken, verifyAdministrador } from "../middleware/oauth";

const rutaCaracteristica = Router();

rutaCaracteristica.get("/listar", verifyToken, listar);
rutaCaracteristica.post("/crear", verifyToken, verifyAdministrador, crear);
rutaCaracteristica.put("/modificar", verifyToken, verifyAdministrador, modificar);
rutaCaracteristica.delete("/eliminar", verifyToken, verifyAdministrador, eliminar);

export default rutaCaracteristica;