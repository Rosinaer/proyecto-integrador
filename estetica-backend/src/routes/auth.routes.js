import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  register, 
  login, 
  perfil, 
  forgotPassword, 
  resetPassword   
} from '../controllers/auth.controller.js';
import verificarToken from '../middleware/verificarToken.js'; 

const router = express.Router();

// ==========================================
// CONFIGURACIÓN DE SEGURIDAD (RATE LIMITING)
// ==========================================

// Bloqueo para evitar ataques de fuerza bruta en el Login (5 intentos max)
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora de bloqueo
  max: 5, // Límite de 5 intentos por IP
  message: { message: "Has superado el límite de 5 intentos fallidos. Por seguridad, esperá 1 hora antes de volver a intentar." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bloqueo para evitar spam de correos de recuperación (3 intentos max)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora de bloqueo
  max: 3, // Límite de 3 intentos por IP
  message: { message: "Demasiados intentos de recuperación. Esperá 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 * post:
 * summary: Registrar un nuevo usuario
 * tags:
 * - Autenticación
 * responses:
 * 201:
 * description: Usuario registrado correctamente
 * 400:
 * description: Datos inválidos
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 * post:
 * summary: Iniciar sesión
 * tags:
 * - Autenticación
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - email
 * - password
 * properties:
 * email:
 * type: string
 * example: admin@espaciosenda.com
 * password:
 * type: string
 * example: miPassword123
 * responses:
 * 200:
 * description: Login exitoso, devuelve token JWT
 * 401:
 * description: Credenciales inválidas
 * 429:
 * description: Demasiados intentos fallidos (Rate limit)
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /api/auth/me:
 * get:
 * summary: Obtener perfil del usuario autenticado
 * tags:
 * - Autenticación
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Perfil obtenido correctamente
 * 401:
 * description: Token inválido o ausente
 */
router.get('/me', verificarToken, perfil);

// --- RUTAS DE RECUPERACIÓN DE CONTRASEÑA ---

/**
 * @swagger
 * /api/auth/forgot-password:
 * post:
 * summary: Solicitar recuperación de contraseña
 * tags:
 * - Autenticación
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - email
 * properties:
 * email:
 * type: string
 * example: usuario@email.com
 * responses:
 * 200:
 * description: Email de recuperación enviado
 * 404:
 * description: Email no encontrado
 */
router.post('/forgot-password', emailLimiter, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 * post:
 * summary: Resetear la contraseña con el token recibido por email
 * tags:
 * - Autenticación
 * responses:
 * 200:
 * description: Contraseña actualizada correctamente
 * 400:
 * description: Token inválido o expirado
 */
router.post('/reset-password', resetPassword);

export default router;