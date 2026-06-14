import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { GestionServiciosProfesional } from "../../components/GestionServiciosProfesional";
import { GestionHorariosRecurrentes } from "../../components/GestionHorariosRecurrentes";
import { PageHeader } from "../../components/ui/PageHeader";
import client, { mensajeDeError } from "../../api/client";

const PURPLE = "#6b21a8";
const BORDER = "#cbd5e1";

const DOC_LABEL = { DNI: "DNI", PASSPORT: "Pasaporte", OTHER: "Otro" };
 
const ROLES = {
  ADMIN:        { label: "Administrador", fg: "#6b21a8" },
  RECEPTIONIST: { label: "Recepción",     fg: "#0369a1" },
  PROFESSIONAL: { label: "Profesional",   fg: "#16a34a" },
  PATIENT:      { label: "Paciente",      fg: "#854d0e" },
};


const labelStyle = { display: "block", marginBottom: 6, fontSize: 13, color: "#555", fontWeight: "bold" };
const errBox = { padding: "10px 12px", borderRadius: 8, backgroundColor: "#fef2f2", color: "#c62828", fontSize: 13, fontWeight: "bold", marginBottom: 14 };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14 };

const MiPerfil = () => {
  const { user, token } = useAuth();
  const banner = useBanner();

  const [perfil, setPerfil] = useState(null);  
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // ── Contraseña ──
  const [formData, setFormData] = useState({ passwordActual: "", passwordNueva: "", confirmarPassword: "" });
  const [cargandoPass, setCargandoPass] = useState(false);
  const [errorPass, setErrorPass] = useState("");
  const [verPass, setVerPass] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await client.get("/users/me");
        setPerfil(data);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setCargando(false);
      }
    })();
  }, [token]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const cambiarPass = async (e) => {
    e.preventDefault();
    setErrorPass("");
    if (formData.passwordNueva !== formData.confirmarPassword) {
      return setErrorPass("Las contraseñas nuevas no coinciden.");
    }
    if (formData.passwordNueva.length < 6) {
      return setErrorPass("La nueva contraseña debe tener al menos 6 caracteres.");
    }
    setCargandoPass(true);
    try {
      await client.patch(`/users/${user.id}/password`, {
        passwordActual: formData.passwordActual,
        passwordNueva: formData.passwordNueva,
      });
      banner.success("Contraseña actualizada");
      setFormData({ passwordActual: "", passwordNueva: "", confirmarPassword: "" });
    } catch (err) {
      setErrorPass(mensajeDeError(err));
    } finally {
      setCargandoPass(false);
    }
  };

  if (cargando) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Cargando perfil...</p>;
  }

  if (error) {
    return <p style={{ color: "red", padding: "20px" }}>{error}</p>;
  }

  const persona = perfil?.person || {};
  const profesional = perfil?.professional || null;
  const rolInfo = ROLES[perfil?.role] || { label: perfil?.role || "—", fg: "#64748b" };
  const docTxt = persona.document ? `${DOC_LABEL[persona.documentType] || ""} ${persona.document}`.trim() : "—";

  return (
    <div> 
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            Mi Perfil
            <span style={{ color: rolInfo.fg, fontWeight: "bold", fontSize: "14px" }}>
              ● {rolInfo.label}
            </span>
          </span>
        }
      />
 
      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "30px",
        }}
      >
        <h3 style={{ color: "#475569", marginBottom: "15px" }}>Datos personales</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
          <p><strong>Nombre:</strong> {persona.name || "—"}</p>
          {profesional && <p><strong>Especialidad:</strong> {profesional.specialty || "—"}</p>}
          <p><strong>Email:</strong> {persona.email || "—"}</p>
          <p><strong>Teléfono:</strong> {persona.phone || "—"}</p>
          <p><strong>Documento:</strong> {docTxt}</p>
        </div>

        {profesional?.bio && (
          <div
            style={{
              marginTop: "15px",
              backgroundColor: "#f8f4ff",
              border: "1px solid #e9d5ff",
              borderRadius: "6px",
              padding: "12px",
            }}
          >
            <strong style={{ color: PURPLE }}>Bio:</strong>
            <p style={{ marginTop: "5px", color: "#475569", fontSize: "14px" }}>{profesional.bio}</p>
          </div>
        )}
      </div>
 
      {profesional?.id && (
        <>
          <div style={{ marginBottom: "30px" }}>
            <GestionServiciosProfesional professionalId={profesional.id} token={token} />
          </div>
          <div style={{ marginBottom: "30px" }}>
            <GestionHorariosRecurrentes professionalId={profesional.id} token={token} />
          </div>
        </>
      )}
 
      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <h3 style={{ color: "#475569", margin: 0 }}>
            <span style={{ marginRight: 8 }} aria-hidden>🔒</span>
            Cambiar contraseña
          </h3>
          <button
            type="button"
            onClick={() => setVerPass((v) => !v)}
            style={{
              border: `1px solid ${BORDER}`, background: "#fff", color: "#475569",
              borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {verPass ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px 0" }}>Actualizá tu contraseña de acceso.</p>

        <form onSubmit={cambiarPass}>
          {errorPass && <div style={errBox}>{errorPass}</div>}

          <div style={{ marginBottom: 16, maxWidth: 360 }}>
            <label style={labelStyle}>Contraseña actual</label>
            <input
              type={verPass ? "text" : "password"}
              name="passwordActual"
              style={inputStyle}
              value={formData.passwordActual}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <div style={{ marginBottom: 16, maxWidth: 360 }}>
            <label style={labelStyle}>Nueva contraseña</label>
            <input
              type={verPass ? "text" : "password"}
              name="passwordNueva"
              style={inputStyle}
              value={formData.passwordNueva}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ marginBottom: 16, maxWidth: 360 }}>
            <label style={labelStyle}>Confirmar nueva contraseña</label>
            <input
              type={verPass ? "text" : "password"}
              name="confirmarPassword"
              style={inputStyle}
              value={formData.confirmarPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <p style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0 0" }}>
            Mínimo 6 caracteres. Usá una combinación que no uses en otros sitios.
          </p>

          <div style={{ marginTop: 18 }}>
            <Button type="submit" disabled={cargandoPass}>
              {cargandoPass ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MiPerfil;