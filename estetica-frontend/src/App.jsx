import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import UsuariosAdmin from "./pages/UsuariosAdmin.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute rolesPermitidos={["ADMIN"]}>
              <UsuariosAdmin />
            </ProtectedRoute>
          }
        />

        <Route path="/no-autorizado" element={<div>No autorizado</div>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;