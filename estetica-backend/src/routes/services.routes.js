import express from "express";
import {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria,
  obtenerServicios,
  obtenerServicioPorId,
  crearServicio,
  actualizarServicio,
  desactivarServicio,
  crearProfessionalService,
  actualizarProfessionalService,
  obtenerServiciosPorProfesional,
} from "../controllers/services.controller.js";
import verificarToken from "../middleware/verificarToken.js";
import authorize from "../middleware/autorizarRoles.js";

const router = express.Router();

// Categorías
router.get(
  "/categories",
  verificarToken,
  authorize(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]),
  obtenerCategorias,
);
router.post(
  "/categories",
  verificarToken,
  authorize(["ADMIN"]),
  crearCategoria,
);
router.patch(
  "/categories/:id",
  verificarToken,
  authorize(["ADMIN"]),
  actualizarCategoria,
);

// Professional services

router.get(
  "/professional-services/by-professional/:professionalId",
  verificarToken,
  authorize(["ADMIN", "PROFESSIONAL"]),
  obtenerServiciosPorProfesional,
);

router.post(
  "/professional-services",
  verificarToken,
  authorize(["ADMIN", "PROFESSIONAL"]),
  crearProfessionalService,
);
router.patch(
  "/professional-services/:id",
  verificarToken,
  authorize(["ADMIN", "PROFESSIONAL"]),
  actualizarProfessionalService,
);

// Servicios
router.get(
  "/",
  verificarToken,
  authorize(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]),
  obtenerServicios,
);
router.get(
  "/:id",
  verificarToken,
  authorize(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]),
  obtenerServicioPorId,
);
router.post("/", verificarToken, authorize(["ADMIN"]), crearServicio);
router.patch("/:id", verificarToken, authorize(["ADMIN"]), actualizarServicio);
router.patch(
  "/:id/deactivate",
  verificarToken,
  authorize(["ADMIN"]),
  desactivarServicio,
);



export default router;
