// ============================================================================
//  DOCUMENTACIÓN SWAGGER  ·  Servicios, Categorías y Servicios Profesionales
// ============================================================================

/**
 * @swagger
 * /api/services/categories:
 *   get:
 *     summary: Obtener todas las categorías de servicios
 *     tags:
 *       - Categorías de Servicios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías obtenida correctamente
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/categories:
 *   post:
 *     summary: Crear una categoría de servicio
 *     tags:
 *       - Categorías de Servicios
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
 *               - displayOrder
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tratamientos Corporales
 *               displayOrder:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Categoría creada correctamente
 *       400:
 *         description: name y displayOrder son obligatorios
 *       409:
 *         description: Ya existe una categoría con ese nombre
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/categories/{id}:
 *   patch:
 *     summary: Actualizar una categoría
 *     tags:
 *       - Categorías de Servicios
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
 *                 example: Bioestimulación Cutánea
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Categoría actualizada correctamente
 *       404:
 *         description: Categoría no encontrada
 *       409:
 *         description: Ya existe una categoría con ese nombre
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/professional-services/by-professional/{professionalId}:
 *   get:
 *     summary: Obtener servicios asociados a un profesional
 *     tags:
 *       - Servicios Profesionales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: professionalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Servicios obtenidos correctamente
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/professional-services:
 *   post:
 *     summary: Asociar un servicio a un profesional
 *     tags:
 *       - Servicios Profesionales
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - professionalId
 *               - serviceId
 *               - price
 *               - durationMinutes
 *             properties:
 *               professionalId:
 *                 type: string
 *                 example: uuid-profesional
 *               serviceId:
 *                 type: string
 *                 example: uuid-servicio
 *               price:
 *                 type: number
 *                 example: 85000
 *               durationMinutes:
 *                 type: integer
 *                 example: 45
 *     responses:
 *       201:
 *         description: Asociación creada correctamente
 *       400:
 *         description: Campos obligatorios faltantes o valores inválidos
 *       409:
 *         description: Ya existe esta combinación profesional-servicio
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/professional-services/{id}:
 *   patch:
 *     summary: Actualizar precio o duración de un servicio por profesional
 *     tags:
 *       - Servicios Profesionales
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
 *               price:
 *                 type: number
 *                 example: 95000
 *               durationMinutes:
 *                 type: integer
 *                 example: 60
 *     responses:
 *       200:
 *         description: Asociación actualizada correctamente
 *       400:
 *         description: Debés enviar al menos price o durationMinutes
 *       404:
 *         description: Configuración profesional-servicio no encontrada
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Obtener todos los servicios
 *     tags:
 *       - Servicios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *     responses:
 *       200:
 *         description: Lista de servicios obtenida correctamente
 *       401: 
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Obtener un servicio por ID
 *     tags:
 *       - Servicios
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
 *         description: Servicio encontrado
 *       404:
 *         description: Servicio no encontrado
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Crear un nuevo servicio
 *     tags:
 *       - Servicios
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
 *               - categoryId
 *               - defaultDurationMinutes
 *             properties:
 *               name:
 *                 type: string
 *                 example: Botox
 *               categoryId:
 *                 type: string
 *                 example: uuid-categoria
 *               defaultDurationMinutes:
 *                 type: integer
 *                 example: 30
 *               requiresPreConsult:
 *                 type: boolean
 *                 example: true
 *               reminderNote:
 *                 type: string
 *                 example: No tomar antiinflamatorios 48 h antes
 *     responses:
 *       201:
 *         description: Servicio creado correctamente
 *       400:
 *         description: Campos obligatorios faltantes o duración inválida
 *       401:
 *         description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/{id}:
 *   patch:
 *     summary: Actualizar un servicio
 *     tags:
 *       - Servicios
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
 *               - categoryId
 *               - defaultDurationMinutes
 *             properties:
 *               name:
 *                 type: string
 *                 example: Botox
 *               categoryId:
 *                 type: string
 *                 example: uuid-categoria
 *               defaultDurationMinutes:
 *                 type: integer
 *                 example: 30
 *               requiresPreConsult:
 *                 type: boolean
 *                 example: true
 *               reminderNote:
 *                 type: string
 *                 example: No tomar antiinflamatorios 48 h antes
 *     responses:
 *       200:
 *         description: Servicio actualizado correctamente
 *       404:
 *         description: Servicio no encontrado
 *       401: 
 *        description: Token inválido o ausente
 */

/**
 * @swagger
 * /api/services/{id}/deactivate:
 *   patch:
 *     summary: Desactivar un servicio
 *     tags:
 *       - Servicios
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
 *         description: Servicio desactivado correctamente
 *       404:
 *         description: Servicio no encontrado
 *       401: 
 *         description: Token inválido o ausente
 */
