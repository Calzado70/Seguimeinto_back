"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = _interopRequireDefault(require("express"));
var _dotenv = require("dotenv");
var _cors = _interopRequireDefault(require("cors"));
var _morgan = _interopRequireDefault(require("morgan"));
var _helmet = _interopRequireDefault(require("helmet"));
var _index = _interopRequireDefault(require("./routers/index.js"));
var _rateLimit = require("./middleware/rateLimit.js");
(0, _dotenv.config)();
var app = (0, _express["default"])();
app.use((0, _helmet["default"])());
app.use(_rateLimit.limiterGeneral);
var isProd = process.env.NODE_ENV === "production";
if (!isProd) {
  app.use((0, _morgan["default"])("dev"));
} else {
  app.use((0, _morgan["default"])("combined"));
}
app.use(_express["default"].json({
  limit: "1mb"
}));

// Configuración CORS mejorada para desarrollo y producción local
var corsOptions = {
  origin: function origin(_origin, callback) {
    // Lista de orígenes permitidos
    var allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000', 'http://127.0.0.1:8080', 'http://192.168.1.13:3000', 'http://192.168.1.13:5000', 'http://192.168.1.13:8080', 'http://192.168.1.13', process.env.FRONTEND_URL].filter(Boolean); // Filtrar valores undefined

    // Permitir peticiones sin origin (Postman, aplicaciones móviles, etc.)
    if (!_origin) {
      return callback(null, true);
    }

    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.includes(_origin)) {
      return callback(null, true);
    }

    // En desarrollo, ser más permisivo con IPs locales
    if (process.env.NODE_ENV !== 'production') {
      // Permitir cualquier IP local (192.168.x.x o 10.x.x.x)
      if (_origin.match(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }
    }
    console.log("CORS: Origin ".concat(_origin, " no permitido"));
    var msg = "CORS: El origen ".concat(_origin, " no est\xE1 permitido por la pol\xEDtica CORS.");
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'X-Access-Token'],
  exposedHeaders: ['X-Total-Count'],
  optionsSuccessStatus: 200,
  // Para navegadores legacy (IE11, diversos SmartTVs)
  maxAge: 86400 // Cache preflight por 24 horas
};
app.use((0, _cors["default"])(corsOptions));

// Middleware para logging adicional (útil para debugging)
app.use(function (req, res, next) {
  var timestamp = new Date().toISOString();
  var origin = req.headers.origin || req.headers.host || 'No origin';
  console.log("[".concat(timestamp, "] ").concat(req.method, " ").concat(req.originalUrl, " - Origin: ").concat(origin));
  next();
});

// Middleware para manejar preflight requests explícitamente
app.options('*', function (req, res) {
  console.log('Preflight request recibido para:', req.originalUrl);
  res.status(200).end();
});

// Health check endpoint
app.get('/health', function (req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
app.set("port", process.env.PORT || 4000);
app.use("/", _index["default"]);

// Middleware para manejo de errores CORS
app.use(function (err, req, res, next) {
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
var _default = exports["default"] = app;