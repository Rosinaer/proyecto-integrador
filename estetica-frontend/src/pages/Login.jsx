import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { homePorRol } from "../config/permisos";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import client from "../api/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const manejarIngreso = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data: datos } = await client.post("/auth/login", { email, password });

      login({ token: datos.token, user: datos.user });

      navigate(homePorRol(datos.user.role));
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Has superado el límite de 5 intentos fallidos. Por seguridad, esperá 1 hora antes de volver a intentar.");
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.mensaje ||
            "Error al iniciar sesión. Revisá tus credenciales."
        );
      }
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <h2>Ingreso al Sistema</h2>

      {error && <p style={{ color: 'status.error.strong', textAlign: 'center', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={manejarIngreso} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit">Ingresar</Button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link
          to="/forgot-password"
          style={{ color: 'colors.brand', textDecoration: 'none', fontSize: '14px' }}
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
};

export default Login;