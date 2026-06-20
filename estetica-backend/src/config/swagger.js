import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Espacio Senda API",
      version: "1.0.0",
      description: "API del sistema de gestión de turnos de Espacio Senda",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],


    tags: [
      { name: "Autenticación", description: "Login, registro y recuperación de contraseña" },
      { name: "Usuarios", description: "Gestión de usuarios del sistema" },
      { name: "Pacientes", description: "Gestión de pacientes" },
      { name: "Profesionales", description: "Gestión de profesionales" },
      { name: "Horarios", description: "Horarios recurrentes (agendas) de los profesionales" },
      { name: "Disponibilidad", description: "Slots de disponibilidad para turnos" },
      { name: "Bloqueos", description: "Bloqueos de agenda (ausencias, feriados)" },
      { name: "Categorías de Servicios", description: "Categorías del catálogo de servicios" },
      { name: "Servicios", description: "Catálogo de servicios" },
      { name: "Servicios Profesionales", description: "Servicios por profesional (precio y duración)" },
      { name: "Turnos", description: "Reserva y gestión de turnos" },
      { name: "Pagos", description: "Pagos, reembolsos e historial financiero" },
      { name: "Recordatorios", description: "Envío de recordatorios automáticos" },
      { name: "Reportes", description: "Reportes de ingresos, turnos y servicios" },
      { name: "Dashboard", description: "Indicadores (KPIs) del sistema" },
    ],
  },
  
  apis: ["./src/docs/*.js"],
};

export default swaggerJsdoc(options);