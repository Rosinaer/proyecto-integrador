import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, rolesPermitidos }) {
  const token = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario?.rol)) {
    return <Navigate to="/no-autorizado" />;
  }

  return children;
}