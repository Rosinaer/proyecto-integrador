import request from 'supertest';
import app from '../app.js'; 

describe('QA Módulo 1: Autenticación', () => {

  describe('POST /api/auth/login', () => {

    // --- TEST 1 ---
    test('Debería retornar Error 400 si se envía un body vacío', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({}); 
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    }); // <-- Acá cierra perfectamente el primer test

    // --- TEST 2 ---
    test('Debería retornar Error 401 si el usuario no existe', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@espaciosenda.com',
          password: 'passwordfalsa'
        });
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Credenciales inválidas');
    }); // <-- Acá cierra el segundo

    // --- TEST 3 ---
    test('Debería retornar Error 401 si la contraseña es incorrecta (pero el mail existe)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@espaciosenda.com', 
          password: 'clavesuperincorrecta'
        });
      
      expect(response.statusCode).toBe(401);
    }); // <-- Acá cierra el tercero

  // --- TEST 4 ---
    test('Debería retornar status 200 y un token JWT si las credenciales son correctas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@espaciosenda.com', 
          password: '123456' 
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      
      // Corregido al inglés para que coincida con el backend
      expect(response.body.user).toHaveProperty('role');
    });

  });

});