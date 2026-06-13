import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ children, rolesPermitidos }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Cargando sistema...</div>; 
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
 
  if (rolesPermitidos && !rolesPermitidos.includes(user.role)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
};

export default ProtectedRoute;