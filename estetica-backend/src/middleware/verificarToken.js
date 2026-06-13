import jwt from 'jsonwebtoken';

const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "Token requerido" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Formato de token inválido" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      peopleId: decoded.peopleId
    };

    next();

  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export default verificarToken;