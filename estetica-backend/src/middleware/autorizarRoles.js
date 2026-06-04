const autorizarRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    try {
      // 1. Escudo protector: Si no hay req.user, el verificarToken falló o no se puso
      if (!req.user) {
        console.error("🚨 CRÍTICO: autorizarRoles se ejecutó pero req.user no existe. ¿Falta verificarToken en la ruta?");
        return res.status(500).json({ 
          error: 'Error de configuración en el servidor (Auth)' 
        });
      }

      // 2. Extraemos el rol
      const { role } = req.user;

      // 3. Verificamos permisos
      if (!rolesPermitidos.includes(role)) {
        return res.status(403).json({
          error: 'Acceso denegado: no tenés permisos para esta acción'
        });
      }

      next();
    } catch (error) {
      // ver por qué falla
      console.error("🔥 Error oculto en autorizarRoles:", error);
      return res.status(500).json({ error: 'Error en autorización' });
    }
  };
};

export default autorizarRoles;