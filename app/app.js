import express from "express";
import {config} from "dotenv";
import cors from "cors";
import morgan from "morgan";
import ruta from "./routers/index.js";

config();

const app = express();

app.use(morgan("dev"));
app.use(express.json());

// Configuración CORS mejorada para desarrollo y producción local
const corsOptions = {
    origin: function (origin, callback) {
        // Lista de orígenes permitidos
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5000',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000',
            'http://127.0.0.1:8080',
            'http://192.168.1.13:3000',
            'http://192.168.1.13:5000',
            'http://192.168.1.13:8080',
            'http://192.168.1.13',
            process.env.FRONTEND_URL
        ].filter(Boolean); // Filtrar valores undefined

        // Permitir peticiones sin origin (Postman, aplicaciones móviles, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Verificar si el origin está en la lista permitida
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // En desarrollo, ser más permisivo con IPs locales
        if (process.env.NODE_ENV !== 'production') {
            // Permitir cualquier IP local (192.168.x.x o 10.x.x.x)
            if (origin.match(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/)) {
                return callback(null, true);
            }
        }

        console.log(`CORS: Origin ${origin} no permitido`);
        const msg = `CORS: El origen ${origin} no está permitido por la política CORS.`;
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-Access-Token'
    ],
    exposedHeaders: ['X-Total-Count'],
    optionsSuccessStatus: 200, // Para navegadores legacy (IE11, diversos SmartTVs)
    maxAge: 86400 // Cache preflight por 24 horas
};

app.use(cors(corsOptions));

// Middleware para logging adicional (útil para debugging)
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const origin = req.headers.origin || req.headers.host || 'No origin';
    const userAgent = req.headers['user-agent'] || 'No user-agent';
    
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - Origin: ${origin}`);
    
    // Log solo en desarrollo para no saturar logs de producción
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
    }
    
    next();
});

// Middleware para manejar preflight requests explícitamente
app.options('*', (req, res) => {
    console.log('Preflight request recibido para:', req.originalUrl);
    res.status(200).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.set("port", process.env.PORT || 4000);

app.use("/", ruta);

// Middleware para manejo de errores CORS
app.use((err, req, res, next) => {
    if (err.message.includes('CORS')) {
        console.error('Error CORS:', err.message);
        res.status(403).json({
            error: 'CORS Error',
            message: 'No tienes permisos para acceder a este recurso desde este origen.',
            origin: req.headers.origin
        });
    } else {
        next(err);
    }
});

export default app;