import express from 'express';
import verificarToken from '../middleware/verificarToken.js';
import autorizarRoles from '../middleware/autorizarRoles.js';
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario, 
  eliminarUsuario,
  cambiarPassword,
  desactivarUsuario, 
  activarUsuario,    
  buscarPersonas,   
  verificarDocumento,
  obtenerMiPerfil,   
  actualizarMiPerfil 
} from '../controllers/users.controller.js';

const router = express.Router();

router.get("/", verificarToken, autorizarRoles(["ADMIN"]), obtenerUsuarios);
router.get("/people", verificarToken, buscarPersonas);
router.get("/check-document", verificarToken, autorizarRoles(["ADMIN"]), verificarDocumento);
router.get("/me", verificarToken, obtenerMiPerfil);
router.patch("/me", verificarToken, actualizarMiPerfil);
router.get("/:id", verificarToken, autorizarRoles(["ADMIN"]), obtenerUsuarioPorId);
router.post("/", verificarToken, autorizarRoles(["ADMIN"]), crearUsuario);
router.patch("/:id", verificarToken, autorizarRoles(["ADMIN"]), actualizarUsuario);
router.patch("/:id/activate", verificarToken, autorizarRoles(["ADMIN"]), activarUsuario);
router.patch("/:id/deactivate", verificarToken, autorizarRoles(["ADMIN"]), desactivarUsuario);
router.delete("/:id", verificarToken, autorizarRoles(["ADMIN"]), eliminarUsuario);
router.patch("/:id/password", verificarToken, cambiarPassword);

export default router;