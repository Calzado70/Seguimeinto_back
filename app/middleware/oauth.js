import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { error } from "../messages/browser";

config();

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      console.warn("Acceso denegado: No hay Authorization header");
      return error(req, res, 401, "Token no proporcionado");
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      console.warn("Acceso denegado: Token vacío");
      return error(req, res, 401, "Token inválido");
    }

    // NO loguear token completo
    console.log("Token recibido: OK");

    const decoded = jwt.verify(token, process.env.TOKEN_PRIVATEKEY);

    req.user = decoded;

    console.log("Usuario autenticado:", {
      id: decoded.id_usuario,
      rol: decoded.rol
    });

    next();

  } catch (e) {
    console.error("Error al validar token:", e.message);

    return error(req, res, 401, "Token inválido o expirado");
  }
};