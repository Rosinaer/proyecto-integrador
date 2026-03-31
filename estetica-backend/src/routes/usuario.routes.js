const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/verificarToken");
const autorizarRoles = require("../middleware/autorizarRoles");

const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} = require("../controllers/usuario.controller");

router.get(
  "/",
  verificarToken,
  autorizarRoles("ADMIN"),
  obtenerUsuarios
);

router.get(
  "/:id",
  verificarToken,
  autorizarRoles("ADMIN"),
  obtenerUsuarioPorId
);

router.post(
  "/",
  verificarToken,
  autorizarRoles("ADMIN"),
  crearUsuario
);

router.put(
  "/:id",
  verificarToken,
  autorizarRoles("ADMIN"),
  actualizarUsuario
);

router.delete(
  "/:id",
  verificarToken,
  autorizarRoles("ADMIN"),
  eliminarUsuario
);

module.exports = router;