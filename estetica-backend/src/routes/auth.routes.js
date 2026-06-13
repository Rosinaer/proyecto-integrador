import express from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import {
  register,
  login,
  perfil,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import verificarToken from '../middleware/verificarToken.js';

const router = express.Router();


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  keyGenerator: (req, res) => ipKeyGenerator(req, res),
  message: { message: "Demasiados intentos desde esta IP, intentá más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req, res) => {
    const email = (req.body?.email || "").toLowerCase().trim();
    return email || ipKeyGenerator(req, res);
  },
  message: { message: "Demasiados intentos fallidos para esta cuenta. Por seguridad, esperá 15 minutos antes de volver a intentar." },
  standardHeaders: true,
  legacyHeaders: false,
});


const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3, 
  keyGenerator: (req, res) => ipKeyGenerator(req, res),
  message: { message: "Demasiados intentos de recuperación. Esperá 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', verificarToken, perfil);
router.post('/forgot-password', emailLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;