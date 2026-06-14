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
import autorizarRoles from "../middleware/autorizarRoles.js";

const router = express.Router();

router.get("/categories", verificarToken, autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]), obtenerCategorias, );
router.post("/categories", verificarToken, autorizarRoles(["ADMIN"]), crearCategoria,);
router.patch("/categories/:id", verificarToken, autorizarRoles(["ADMIN"]), actualizarCategoria);

router.get("/professional-services/by-professional/:professionalId", verificarToken, autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]), obtenerServiciosPorProfesional);
router.post("/professional-services", verificarToken, autorizarRoles(["ADMIN", "PROFESSIONAL"]), crearProfessionalService);
router.patch("/professional-services/:id", verificarToken, autorizarRoles(["ADMIN", "PROFESSIONAL"]), actualizarProfessionalService);

router.get("/", verificarToken, autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]), obtenerServicios);
router.get("/:id", verificarToken, autorizarRoles(["ADMIN", "RECEPTIONIST", "PROFESSIONAL"]), obtenerServicioPorId);
router.post("/", verificarToken, autorizarRoles(["ADMIN"]), crearServicio);
router.patch("/:id", verificarToken, autorizarRoles(["ADMIN"]), actualizarServicio);
router.patch("/:id/deactivate", verificarToken, autorizarRoles(["ADMIN"]), desactivarServicio);

export default router;