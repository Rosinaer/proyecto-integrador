// ============================================================================
//  DOCUMENTACIÓN SWAGGER  ·  Usuarios
// ============================================================================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida correctamente
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/people:
 *   get:
 *     summary: Buscar personas (pacientes y profesionales)
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: documento
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Personas encontradas correctamente
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *               - rol
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: María García
 *               email:
 *                 type: string
 *                 example: maria@espaciosenda.com
 *               document:
 *                 type: string
 *                 example: 32123456
 *               documentType:
 *                 type: string
 *                 example: DNI
 *               phone:
 *                 type: string
 *                 example: 11-2345-6789
 *               password:
 *                 type: string
 *                 example: Password123!
 *               rol:
 *                 type: string
 *                 example: RECEPTIONIST
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Actualizar un usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *               rol:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activar un usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario activado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Desactivar un usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario desactivado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/{id}/password:
 *   patch:
 *     summary: Cambiar contraseña de un usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passwordActual
 *               - passwordNueva
 *             properties:
 *               passwordActual:
 *                 type: string
 *                 example: MiPasswordActual123
 *               passwordNueva:
 *                 type: string
 *                 example: MiPasswordNueva456
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *       400:
 *         description: Contraseña actual incorrecta
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/check-document:
 *   get:
 *     summary: Verificar si un documento ya existe (sin crear nada)
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DNI, PASSPORT, CUIL, CUIT]
 *       - in: query
 *         name: document
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Indica si la persona existe, si ya tiene usuario y sus fichas
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Obtener el perfil propio del usuario autenticado
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario logueado
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 *   patch:
 *     summary: Actualizar el perfil propio
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               document:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [DNI, PASSPORT, CUIL, CUIT]
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *       400:
 *         description: documentType inválido
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */