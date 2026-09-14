import { Router } from "express";
import { listar, crear, modificar, eliminar } from "../controllers/controller.caracteristica";

const rutaCaracteristica = Router();

rutaCaracteristica.get("/listar", listar);
rutaCaracteristica.post("/crear", crear);
rutaCaracteristica.put("/modificar", modificar);
rutaCaracteristica.delete("/eliminar", eliminar);

export default rutaCaracteristica;