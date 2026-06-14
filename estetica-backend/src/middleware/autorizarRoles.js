const autorizarRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    try {

      if (!req.user) {
        console.error("🚨 CRÍTICO: autorizarRoles se ejecutó pero req.user no existe. ¿Falta verificarToken en la ruta?");
        return res.status(500).json({ 
          error: 'Error de configuración en el servidor (Auth)' 
        });
      }

      
      const { role } = req.user;

      
      if (!rolesPermitidos.includes(role)) {
        return res.status(403).json({
          error: 'Acceso denegado: no tenés permisos para esta acción'
        });
      }

      next();
    } catch (error) {
      console.error("🔥 Error oculto en autorizarRoles:", error);
      return res.status(500).json({ error: 'Error en autorización' });
    }
  };
};

export default autorizarRoles;