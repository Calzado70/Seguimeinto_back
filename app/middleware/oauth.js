import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { error } from "../messages/browser";

config();

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return error(req, res, 401, "Token no proporcionado");
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return error(req, res, 401, "Token inválido");
    }

    const decoded = jwt.verify(token, process.env.TOKEN_PRIVATEKEY);

    req.user = decoded;

    next();

  } catch (e) {
    return error(req, res, 401, "Token inválido o expirado");
  }
};

export const verifyAdministrador = (req, res, next) => {
  if (req.user && req.user.rol === "ADMINISTRADOR") {
    return next();
  }
  return error(req, res, 403, "No tienes permisos para realizar esta acción");
};