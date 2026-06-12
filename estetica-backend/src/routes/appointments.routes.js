import express from 'express';
import {
  obtenerHorariosDisponibles,
  obtenerOpcionesPorServicio,
  obtenerDiasDisponibles,
  obtenerTurnos,
  obtenerTurnoPorId,
  crearTurno,
  crearSobreturno,
  cambiarEstadoTurno,
  reprogramarTurno,
} from '../controllers/appointments.controller.js';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';

const router = express.Router();

// IMPORTANTE: /available-slots debe ir ANTES de /:id

/**
 * @swagger
 * /api/appointments/available-slots:
 *   get:
 *     summary: Obtener horarios disponibles para un turno
 *     tags:
 *       - Turnos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: professionalId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         example: "2026-05-07"
 *     responses:
 *       200:
 *         description: Horarios disponibles obtenidos correctamente
 *       400:
 *         description: professionalId, serviceId y date son obligatorios
 *       404:
 *         description: El profesional no ofrece ese servicio o no tiene disponibilidad
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/available-slots', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerHorariosDisponibles);
router.get('/service-options', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerOpcionesPorServicio);
router.get('/available-days', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerDiasDisponibles);
/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Obtener todos los turnos
 *     tags:
 *       - Turnos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: professionalId
 *         schema:
 *           type: string
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW, IN_PROGRESS]
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           example: "2026-01-01"
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Lista de turnos obtenida correctamente
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerTurnos);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Obtener un turno por ID
 *     tags:
 *       - Turnos
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
 *         description: Turno encontrado
 *       404:
 *         description: Turno no encontrado
 *       401:
 *         description: Token inválido o ausente
 */


router.post('/overbook', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST']), crearSobreturno);
router.post('/', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST']), crearTurno);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Cambiar el estado de un turno
 *     tags:
 *       - Turnos
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, CANCELLED, COMPLETED, NO_SHOW, IN_PROGRESS]
 *                 example: CONFIRMED
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       400:
 *         description: Transición de estado inválida
 *       404:
 *         description: Turno no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

router.get('/:id', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), obtenerTurnoPorId);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Crear un nuevo turno
 *     tags:
 *       - Turnos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - professionalServiceId
 *               - availabilityId
 *               - patientId
 *               - startsAt
 *             properties:
 *               professionalServiceId:
 *                 type: string
 *                 example: uuid-professional-service
 *               availabilityId:
 *                 type: string
 *                 example: uuid-availability
 *               patientId:
 *                 type: string
 *                 example: uuid-patient
 *               startsAt:
 *                 type: string
 *                 example: "2026-06-10T09:00:00Z"
 *               notes:
 *                 type: string
 *                 example: Paciente sin antecedentes
 *     responses:
 *       201:
 *         description: Turno creado correctamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: El horario se superpone con un turno existente
 *       404:
 *         description: Servicio, disponibilidad o paciente no encontrado
 *       401:
 *         description: Token inválido o ausente
 */



router.patch('/:id/status',    verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST', 'PROFESSIONAL']), cambiarEstadoTurno);
router.patch('/:id/reschedule', verificarToken, autorizarRoles(['ADMIN', 'RECEPTIONIST']), reprogramarTurno);

export default router;