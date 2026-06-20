// ============================================================================
//  DOCUMENTACIÓN SWAGGER  ·  Recordatorios
// ============================================================================

/**
 * @swagger
 * /api/reminders/enviar:
 *   post:
 *     summary: Disparar recordatorios manualmente (solo ADMIN)
 *     tags:
 *       - Recordatorios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recordatorios procesados correctamente
 *       401:
 *         description: Token inválido o ausente
 *       403:
 *         description: Acceso denegado (rol sin permiso)
 *       500:
 *         description: Error al procesar recordatorios
 */
