const prisma = require("../config/prisma");

const getDashboard = async (req, res) => {
  try {
    // Fechas bien separadas (NO reutilizo el mismo Date)
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    // Turnos de hoy
    const turnosHoy = await prisma.turno.count({
      where: {
        fechaInicio: {
          gte: inicioDia,
          lte: finDia
        }
      }
    });

    // Ingresos totales
    const ingresos = await prisma.pago.aggregate({
      _sum: {
        monto: true
      }
    });

    // Turnos cancelados
    const cancelados = await prisma.turno.count({
      where: {
        estado: "CANCELADO"
      }
    });

    res.json({
      turnosHoy,
      ingresos: ingresos._sum.monto || 0,
      cancelados
    });

  } catch (error) {
    console.log("ERROR DASHBOARD:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboard };