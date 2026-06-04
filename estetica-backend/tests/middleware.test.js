import request from 'supertest';
import app from '../app.js';
import jwt from 'jsonwebtoken';

// Función auxiliar para fabricar credenciales 
const generarToken = (role) => {
  return jwt.sign(
    { id: 999, role: role, email: 'test@espaciosenda.com' },
    process.env.JWT_SECRET || 'espaciosenda', // Usamos .env
    { expiresIn: '1h' }
  );
};

describe('QA Módulo 1: Middleware de Roles y Seguridad', () => {

  // Usamos una ruta que sabemos que requiere permisos altos
  const rutaProtegida = '/api/reports/income'; 

  test('Debería bloquear el acceso si no se envía un token', async () => {
    const response = await request(app).get(rutaProtegida);
    
    // Puede devolver 401 o 403
    expect([401, 403]).toContain(response.statusCode);
  });

  test('Debería bloquear el acceso si el token es inválido o inventado', async () => {
    const response = await request(app)
      .get(rutaProtegida)
      .set('Authorization', 'Bearer soy_un_token_falso_y_malicioso');

    expect([401, 403]).toContain(response.statusCode);
  });

  test('Debería bloquear el acceso (Error 403) si el usuario es PATIENT', async () => {
    // Le damos una credencial de paciente
    const tokenPaciente = generarToken('PATIENT');

    const response = await request(app)
      .get(rutaProtegida)
      .set('Authorization', `Bearer ${tokenPaciente}`);

    // Un paciente jamás debería poder ver los ingresos del sistema
    expect(response.statusCode).toBe(403); 
  });

  // Nota: No testeamos el éxito (200) de esta ruta acá porque eso depende 
  // del código de Damián.
});