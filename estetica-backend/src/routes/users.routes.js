import express from 'express';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario, 
  eliminarUsuario,
  cambiarPassword,
  desactivarUsuario, 
  activarUsuario,    
  buscarPersonas,   
  obtenerMiPerfil,   
  actualizarMiPerfil 
} from '../controllers/users.controller.js';

const router = express.Router();

// SOLO ADMIN puede ver usuarios
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
router.get(
  "/",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  obtenerUsuarios
);

// BUSCADOR DE PERSONAS (Pacientes/Profesionales)
// Ojo: Si tu router principal está en "/users", esta ruta será "/users/people"

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
router.get(
  "/people",
  verificarToken,
  buscarPersonas
);

// PERFIL PROPIO — cualquier usuario logueado puede ver/editar sus datos.
// Debe ir ANTES de "/:id" para que "me" no se interprete como un id.
router.get("/me", verificarToken, obtenerMiPerfil);
router.patch("/me", verificarToken, actualizarMiPerfil);

// SOLO ADMIN puede ver usuario por ID

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
router.get(
  "/:id",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  obtenerUsuarioPorId
);

// SOLO ADMIN puede crear usuarios (¡Le agregué seguridad!)
// Antes estaba sin token, pero en un sistema de clínica no queremos 
// que cualquier persona en internet se cree un usuario Administrador.

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
router.post(
  "/",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  crearUsuario
);

// SOLO ADMIN puede actualizar (Cambiado de PUT a PATCH según el documento de tareas)

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
router.patch(
  "/:id",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  actualizarUsuario
);

// SOLO ADMIN puede activar un usuario

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
router.patch(
  "/:id/activate",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  activarUsuario
);

// SOLO ADMIN puede desactivar un usuario

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
router.patch(
  "/:id/deactivate",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  desactivarUsuario
);

// SOLO ADMIN puede eliminar

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
router.delete(
  "/:id",
  verificarToken,
  autorizarRoles(["ADMIN"]),
  eliminarUsuario
);

// Cualquier usuario logueado puede cambiar SU PROPIA contraseña

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
router.patch(
  "/:id/password",
  verificarToken,
  cambiarPassword
);

export default router;