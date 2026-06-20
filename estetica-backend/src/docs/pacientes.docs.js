// ============================================================================
//  DOCUMENTACIÓN SWAGGER  ·  Pacientes
// ============================================================================

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Obtener todos los pacientes
 *     tags:
 *       - Pacientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pacientes obtenida correctamente
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Obtener un paciente por ID
 *     tags:
 *       - Pacientes
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
 *         description: Paciente encontrado
 *       404:
 *         description: Paciente no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Crear un nuevo paciente
 *     tags:
 *       - Pacientes
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Valentina Romero
 *               documentType:
 *                 type: string
 *                 enum: [DNI, PASSPORT, CUIL, CUIT]
 *                 example: DNI
 *               document:
 *                 type: string
 *                 example: 35456789
 *               email:
 *                 type: string
 *                 example: valentina@email.com
 *               phone:
 *                 type: string
 *                 example: 11-3456-7890
 *               cuilCuit:
 *                 type: string
 *                 example: 27354567890
 *               clinicalNotes:
 *                 type: string
 *                 example: Alergia a la lidocaína
 *     responses:
 *       201:
 *         description: Paciente creado correctamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Ya existe un paciente con ese email
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   patch:
 *     summary: Actualizar un paciente
 *     tags:
 *       - Pacientes
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
 *               documentType:
 *                 type: string
 *                 enum: [DNI, PASSPORT, CUIL, CUIT]
 *               document:
 *                 type: string
 *               phone:
 *                 type: string
 *               cuilCuit:
 *                 type: string
 *               clinicalNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paciente actualizado correctamente
 *       404:
 *         description: Paciente no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/patients/{id}/appointments:
 *   get:
 *     summary: Obtener el historial de turnos de un paciente
 *     tags:
 *       - Pacientes
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
 *         description: Historial de turnos obtenido correctamente
 *       404:
 *         description: Paciente no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/patients/{id}/payments:
 *   get:
 *     summary: Obtener el historial de pagos de un paciente
 *     tags:
 *       - Pacientes
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
 *         description: Historial de pagos obtenido correctamente
 *       404:
 *         description: Paciente no encontrado
 *       401:
 *         description: Token inválido o ausente
 */
