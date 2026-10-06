import { Router } from "express";
import { consultarAuditoria, consultarHistorial } from "../controllers/controller.historial.js";
import { verifyToken, verifyAdministrador } from "../middleware/oauth.js";

const rutaHistorial = Router();

rutaHistorial.get("/historial", verifyToken, consultarHistorial);
// Auditoría de la Fase 4.3: solo administradores, igual que la gestión
// de usuarios y catálogo que se audita.
rutaHistorial.get("/auditoria", verifyToken, verifyAdministrador, consultarAuditoria);
// rutaHistorial.get("/logistica"); // Assuming you want to show sent products as well

export default rutaHistorial;