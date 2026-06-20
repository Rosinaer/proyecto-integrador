// ============================================================================
//  DOCUMENTACIÓN SWAGGER  ·  Autenticación
// ============================================================================



/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags:
 *       - Autenticación
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@espaciosenda.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve token JWT
 *       400:
 *         description: Faltan email o contraseña
 *       401:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos fallidos
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     tags:
 *       - Autenticación
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@email.com
 *     responses:
 *       200:
 *         description: Email de recuperación enviado
 *       404:
 *         description: Email no encontrado
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Resetear la contraseña con el token recibido por email
 *     tags:
 *       - Autenticación
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - nuevaPassword
 *             properties:
 *               token: { type: string, example: "a1b2c3d4..." }
 *               nuevaPassword: { type: string, example: "miNuevaClave123" }
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *       400:
 *         description: Token inválido o expirado
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registro público de un nuevo paciente
 *     description: Permite que un paciente cree su propia cuenta (rol PATIENT). No requiere token.
 *     tags:
 *       - Autenticación
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - email
 *               - password
 *               - documento
 *             properties:
 *               nombre: { type: string, example: Juan }
 *               apellido: { type: string, example: Pérez }
 *               email: { type: string, example: juan@example.com }
 *               password: { type: string, example: "miClave123" }
 *               documento: { type: string, example: "30123456" }
 *     responses:
 *       201:
 *         description: Paciente registrado correctamente
 *       400:
 *         description: Datos faltantes, email inválido, contraseña corta o email ya registrado
 */