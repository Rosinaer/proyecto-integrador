export const getUsuario = () => {
  const usuario = localStorage.getItem("usuario");
  return usuario ? JSON.parse(usuario) : null;
};

export const getToken = () => {
  return localStorage.getItem("token");
};