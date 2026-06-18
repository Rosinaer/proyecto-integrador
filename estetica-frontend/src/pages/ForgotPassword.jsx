import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import client, { mensajeDeError } from "../api/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setCargando(true);

    try {
      const { data: datos } = await client.post("/auth/forgot-password", { email });

      setMensaje(datos.mensaje);
      setEmail("");
    } catch (err) {
      setError(mensajeDeError(err) || "Ocurrió un error al enviar el correo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <h2>Recuperar Contraseña</h2>
      <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
        Ingresá tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
      </p>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green', textAlign: 'center', fontWeight: 'bold' }}>{mensaje}</p>}

      <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Input
          type="email"
          placeholder="Tu correo electrónico registrado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" disabled={cargando}>
          {cargando ? "Enviando..." : "Enviar link de recuperación"}
        </Button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/login" style={{ color: 'colors.brand', textDecoration: 'none' }}>
          Volver al Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;