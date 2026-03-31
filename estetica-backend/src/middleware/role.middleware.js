function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    // req.usuario viene del middleware verificarToken
    if (!req.usuario || !req.usuario.rol) {
      return res.status(401).json({ mensaje: "Usuario no autenticado" });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tienes permisos para acceder" });
    }

    next();
  };
}

module.exports = autorizarRoles;