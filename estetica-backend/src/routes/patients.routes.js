import express from "express";
import {
  obtenerPacientes,
  obtenerPacientePorId,
  crearPaciente,
  actualizarPaciente,
  obtenerHistorialTurnos,
  obtenerHistorialPagos,
} from "../controllers/patients.controller.js";
import verificarToken from "../middleware/verificarToken.js";
import autorizarRoles from "../middleware/autorizarRoles.js";

const router = express.Router();
router.get(
  "/",
  verificarToken,
  autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]),
  obtenerPacientes,
);

router.get(
  "/:id",
  verificarToken,
  autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]),
  obtenerPacientePorId,
);

router.post(
  "/",
  verificarToken,
  autorizarRoles(["ADMIN", "RECEPTIONIST"]),
  crearPaciente,
);

router.patch(
  "/:id",
  verificarToken,
  autorizarRoles(["ADMIN", "RECEPTIONIST"]),
  actualizarPaciente,
);

router.get(
  "/:id/appointments",
  verificarToken,
  autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]),
  obtenerHistorialTurnos,
);

router.get(
  "/:id/payments",
  verificarToken,
  autorizarRoles(["ADMIN", "RECEPTIONIST"]),
  obtenerHistorialPagos,
);

export default router;
