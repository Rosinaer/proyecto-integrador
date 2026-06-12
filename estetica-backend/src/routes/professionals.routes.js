import express from 'express';
import {
  obtenerProfesionales,
  obtenerProfesionalPorId,
  crearProfesional,
  actualizarProfesional,
} from '../controllers/professionals.controller.js';
import {
  obtenerHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
} from '../controllers/schedule.controller.js';
import {
  generarDisponibilidad,
  revertirDisponibilidad,
  obtenerDisponibilidad,
  crearSlotManual,
  actualizarSlot,
  eliminarSlot,
  archivarSlot,
  archivarMes,  
} from '../controllers/availability.controller.js';
import {
  obtenerBloqueos,
  crearBloqueo,
  eliminarBloqueo,
} from '../controllers/exceptions.controller.js';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';

const router = express.Router();


// ── PROFESIONALES ────────────────────────────────────────────
/**
 * @swagger
 * /api/professionals:
 *   get:
 *     summary: Obtener todos los profesionales
 *     tags:
 *       - Profesionales
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de profesionales obtenida correctamente
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST']), obtenerProfesionales);

/**
 * @swagger
 * /api/professionals/{id}:
 *   get:
 *     summary: Obtener un profesional por ID
 *     tags:
 *       - Profesionales
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
 *         description: Profesional encontrado
 *       404:
 *         description: Profesional no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/:id', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerProfesionalPorId);

/**
 * @swagger
 * /api/professionals:
 *   post:
 *     summary: Crear un nuevo profesional
 *     tags:
 *       - Profesionales
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - documentType
 *               - document
 *               - email
 *               - phone
 *               - specialty
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dra. Leila Senger
 *               documentType:
 *                 type: string
 *                 enum: [DNI, PASSPORT, CUIL, CUIT]
 *                 example: DNI
 *               document:
 *                 type: string
 *                 example: 28123456
 *               email:
 *                 type: string
 *                 example: lsenger@espaciosenda.com
 *               phone:
 *                 type: string
 *                 example: 11-3456-7890
 *               specialty:
 *                 type: string
 *                 example: Medicina Estética
 *               bio:
 *                 type: string
 *                 example: Especialista en medicina estética con 10 años de experiencia
 *               googleCalendarId:
 *                 type: string
 *                 example: lsenger@gmail.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Profesional creado correctamente
 *       409:
 *         description: Ya existe un profesional con ese email
 *       401:
 *         description: Token inválido o ausente
 */
router.post('/', verificarToken, autorizarRoles(['ADMIN']), crearProfesional);

/**
 * @swagger
 * /api/professionals/{id}:
 *   patch:
 *     summary: Actualizar un profesional
 *     tags:
 *       - Profesionales
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
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               specialty:
 *                 type: string
 *               bio:
 *                 type: string
 *               googleCalendarId:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Profesional actualizado correctamente
 *       404:
 *         description: Profesional no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
router.patch('/:id', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), actualizarProfesional);

// ── HORARIOS SEMANALES ───────────────────────────────────────
/**
 * @swagger
 * /api/professionals/{id}/schedule:
 *   get:
 *     summary: Obtener los horarios semanales de un profesional
 *     tags:
 *       - Horarios
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
 *         description: Horarios obtenidos correctamente
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/:id/schedule', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerHorarios);

/**
 * @swagger
 * /api/professionals/{id}/schedule:
 *   post:
 *     summary: Crear un horario semanal para un profesional
 *     tags:
 *       - Horarios
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
 *               - dayOfWeek
 *               - startTime
 *               - endTime
 *             properties:
 *               dayOfWeek:
 *                 type: integer
 *                 example: 2
 *                 description: "0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb"
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "18:00"
 *     responses:
 *       201:
 *         description: Horario creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o ausente
 */
router.post('/:id/schedule', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), crearHorario);

/**
 * @swagger
 * /api/professionals/{id}/schedule/{scheduleId}:
 *   patch:
 *     summary: Actualizar un horario semanal
 *     tags:
 *       - Horarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dayOfWeek:
 *                 type: integer
 *                 example: 3
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "17:00"
 *     responses:
 *       200:
 *         description: Horario actualizado correctamente
 *       404:
 *         description: Horario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
router.patch('/:id/schedule/:scheduleId', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), actualizarHorario);

/**
 * @swagger
 * /api/professionals/{id}/schedule/{scheduleId}:
 *   delete:
 *     summary: Eliminar un horario semanal
 *     tags:
 *       - Horarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Horario eliminado correctamente
 *       404:
 *         description: Horario no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
router.delete('/:id/schedule/:scheduleId', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), eliminarHorario);

// ── DISPONIBILIDAD ───────────────────────────────────────────
/**
 * @swagger
 * /api/professionals/{id}/availability:
 *   get:
 *     summary: Obtener la disponibilidad de un profesional
 *     tags:
 *       - Disponibilidad
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
 *         description: Disponibilidad obtenida correctamente
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/:id/availability', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerDisponibilidad);

/**
 * @swagger
 * /api/professionals/{id}/availability/generate:
 *   post:
 *     summary: Generar disponibilidad mensual desde la plantilla de horarios
 *     tags:
 *       - Disponibilidad
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
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: integer
 *                 example: 6
 *                 description: Mes a generar (1-12)
 *               year:
 *                 type: integer
 *                 example: 2026
 *     responses:
 *       201:
 *         description: Disponibilidad generada correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o ausente
 */
router.post('/:id/availability/generate', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), generarDisponibilidad);

/**
 * @swagger
 * /api/professionals/{id}/availability:
 *   post:
 *     summary: Crear un slot de disponibilidad manual
 *     tags:
 *       - Disponibilidad
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
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 example: "2026-06-15"
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "13:00"
 *     responses:
 *       201:
 *         description: Slot creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o ausente
 */
router.post('/:id/availability', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), crearSlotManual);

router.patch('/:id/availability/archive-month', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), archivarMes);
router.patch('/:id/availability/:availabilityId/archive', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), archivarSlot);
/**
 * @swagger
 * /api/professionals/{id}/availability/{availabilityId}:
 *   patch:
 *     summary: Actualizar un slot de disponibilidad
 *     tags:
 *       - Disponibilidad
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: availabilityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "14:00"
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Slot actualizado correctamente
 *       404:
 *         description: Slot no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
router.patch('/:id/availability/:availabilityId', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), actualizarSlot);

/**
 * @swagger
 * /api/professionals/{id}/availability/revert:
 *   delete:
 *     summary: Revertir la apertura de agenda de un profesional
 *     tags:
 *       - Disponibilidad
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
 *         description: Disponibilidad revertida correctamente
 *       401:
 *         description: Token inválido o ausente
 */
router.delete('/:id/availability/revert', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), revertirDisponibilidad);

router.delete('/:id/availability/:availabilityId', verificarToken, autorizarRoles(['ADMIN', 'PROFESSIONAL']), eliminarSlot);

// ── BLOQUEOS ─────────────────────────────────────────────────
/**
 * @swagger
 * /api/professionals/{id}/exceptions:
 *   get:
 *     summary: Obtener los bloqueos de agenda de un profesional
 *     tags:
 *       - Bloqueos
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
 *         description: Bloqueos obtenidos correctamente
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/:id/exceptions', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerBloqueos);

/**
 * @swagger
 * /api/professionals/{id}/exceptions:
 *   post:
 *     summary: Crear un bloqueo de agenda
 *     tags:
 *       - Bloqueos
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
 *               - exceptionDate
 *               - exceptionType
 *             properties:
 *               exceptionDate:
 *                 type: string
 *                 example: "2026-07-09"
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *                 description: Opcional. Si no se envía se bloquea el día completo
 *               endTime:
 *                 type: string
 *                 example: "13:00"
 *                 description: Opcional. Si no se envía se bloquea el día completo
 *               exceptionType:
 *                 type: string
 *                 enum: [VACATION, MEETING, PERSONAL, OTHER]
 *                 example: VACATION
 *               reason:
 *                 type: string
 *                 example: Día feriado nacional
 *     responses:
 *       201:
 *         description: Bloqueo creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o ausente
 */
router.post('/:id/exceptions', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), crearBloqueo);

/**
 * @swagger
 * /api/professionals/{id}/exceptions/{exceptionId}:
 *   delete:
 *     summary: Eliminar un bloqueo de agenda
 *     tags:
 *       - Bloqueos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: exceptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bloqueo eliminado correctamente
 *       404:
 *         description: Bloqueo no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
router.delete('/:id/exceptions/:exceptionId', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), eliminarBloqueo);


export default router;