import { rateLimit } from "express-rate-limit";

export const limiterGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        status: 429,
        message: "Demasiadas peticiones. Intente de nuevo en unos minutos."
    },
    skip: (req) => req.path === "/user/loginusuario"
});

export const limiterLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        status: 429,
        message: "Demasiados intentos de inicio de sesión. Espere 15 minutos."
    }
});