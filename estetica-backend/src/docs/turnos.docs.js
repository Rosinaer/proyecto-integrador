// ============================================================================
//  DOCUMENTACIÓN SWAGGER  ·  Turnos
// ============================================================================

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

/**
 * @swagger
 * /api/appointments/service-options:
 *   get:
 *     summary: Obtener opciones de profesionales para un servicio
 *     tags:
 *       - Turnos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           example: "2026-06-20"
 *         description: Fecha desde la cual buscar (opcional, por defecto hoy)
 *     responses:
 *       200:
 *         description: Opciones obtenidas correctamente
 *       400:
 *         description: serviceId es obligatorio
 *       404:
 *         description: Servicio no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/appointments/available-days:
 *   get:
 *     summary: Obtener los días disponibles de un profesional en un mes
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
 *         description: Uno o varios servicios (serviceId o serviceIds)
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2026
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           example: 6
 *     responses:
 *       200:
 *         description: Días disponibles obtenidos correctamente
 *       400:
 *         description: professionalId, serviceId(s), year y month son obligatorios
 *       404:
 *         description: El profesional no ofrece alguno de los servicios
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/appointments/overbook:
 *   post:
 *     summary: Crear un sobreturno (fuera de la disponibilidad normal)
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
 *               - patientId
 *               - startsAt
 *             properties:
 *               professionalServiceId:
 *                 type: string
 *                 description: Servicio del profesional (o usar professionalServiceIds para varios)
 *               professionalServiceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               patientId:
 *                 type: string
 *               startsAt:
 *                 type: string
 *                 example: "2026-06-10T15:30:00Z"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sobreturno creado correctamente
 *       400:
 *         description: professionalService(s), patientId y startsAt son obligatorios
 *       403:
 *         description: Solo podés agendar en tu propia agenda
 *       404:
 *         description: Servicio o paciente no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/appointments/{id}/reschedule:
 *   patch:
 *     summary: Reprogramar un turno a otro horario
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
 *               - availabilityId
 *               - startsAt
 *             properties:
 *               availabilityId:
 *                 type: string
 *               startsAt:
 *                 type: string
 *                 example: "2026-06-12T11:00:00Z"
 *     responses:
 *       200:
 *         description: Turno reprogramado correctamente
 *       400:
 *         description: availabilityId y startsAt son obligatorios
 *       403:
 *         description: Solo podés reprogramar turnos propios
 *       404:
 *         description: Turno o disponibilidad no encontrada
 *       409:
 *         description: El nuevo horario se superpone con un turno existente
 *       401:
 *         description: Token inválido o ausente
 */