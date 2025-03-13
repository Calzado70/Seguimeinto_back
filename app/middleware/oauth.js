import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { error, success } from "../messages/browser";
config();

export const verifyToken = async (req, res, next) => {
    const token = req.headers['x-access-token'];

    console.log('Token recibido:', token);

    if (!token) {
        console.log("Acceso denegado: Token no proporcionado");
        return success(req, res, 401, "Acceso denegado.");
    }

    try {
        // Verificar el token usando la clave privada
        const valida = await jwt.verify(token, process.env.TOKEN_PRIVATEKEY);
        req.user = valida; // Adjuntar los datos del usuario a la solicitud
        console.log('Usuario autenticado:', req.user);
        next();
    } catch (e) {
        console.error("Error al validar token:", e);
        error(req, res, 401, "Token inválido o expirado.");
    }
};