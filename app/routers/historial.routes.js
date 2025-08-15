import { Router } from "express";
import { consultarHistorial } from "../controllers/controller.historial.js";

const rutaHistorial = Router();

rutaHistorial.get("/historial", consultarHistorial);
// rutaHistorial.get("/logistica"); // Assuming you want to show sent products as well

export default rutaHistorial;