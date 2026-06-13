const errorHandler = (err, req, res, next) => {
 
  
  console.error('🔥', err);

  
  if (err.status) {
    return res.status(err.status).json({ mensaje: err.message });
  }

  
  switch (err.code) {
    case 'P2002':  
      return res
        .status(409)
        .json({ mensaje: 'Ya existe un registro con ese valor único' });
    case 'P2025':  
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    case 'P2003': 
      return res
        .status(400)
        .json({ mensaje: 'Referencia inválida: el registro relacionado no existe' });
    default:
      break;
  }

  
  return res.status(500).json({ error: 'Error interno del servidor' });
};

export default errorHandler;
