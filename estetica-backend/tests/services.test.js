import request from 'supertest';
import app from '../app.js';
import jwt from 'jsonwebtoken';

// Función para simular un Token de Admin
const generarTokenAdmin = () => {
  return jwt.sign(
    { id: 1, role: 'ADMIN', email: 'admin@espaciosenda.com' },
    process.env.JWT_SECRET || 'espaciosenda',
    { expiresIn: '1h' }
  );
};

describe('QA Módulo 4: Validaciones de Servicios', () => {
  const token = generarTokenAdmin();

  describe('POST /api/services', () => {

    test('Debería retornar Error 400 si faltan campos obligatorios', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '', // Nombre vacío
          categoryId: 'algun-id',
          defaultDurationMinutes: 30
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('mensaje');
    });

    test('Debería retornar Error 400 si la duración es menor o igual a 0', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Limpieza Facial Deep',
          categoryId: 'id-categoria-facial',
          defaultDurationMinutes: -5 // ❌ Duración inválida
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('mensaje');
      expect(response.body.mensaje).toBe('defaultDurationMinutes debe ser mayor a 0');
    });

  });
});