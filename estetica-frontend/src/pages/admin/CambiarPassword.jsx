import { useState, useEffect } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useBanner } from "../../components/ui/Banner";
import { PageHeader } from "../../components/ui/PageHeader";

const PURPLE = "#6b21a8";
const BORDER = "#cbd5e1";

const DOC_OPTIONS = [
  { value: "DNI", label: "DNI" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "OTHER", label: "Otro" },
];


const CambiarPassword = () => {
  const { user, token } = useAuth();
  const banner = useBanner();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ── Datos propios ──
  const [perfil, setPerfil] = useState({ name: "", email: "", phone: "", document: "", documentType: "DNI" });
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");

  // ── Contraseña ──
  const [formData, setFormData] = useState({ passwordActual: "", passwordNueva: "", confirmarPassword: "" });
  const [cargandoPass, setCargandoPass] = useState(false);
  const [errorPass, setErrorPass] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/users/me`, { headers: authHeaders });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo cargar el perfil");
        setPerfil({
          name: data.person?.name || "",
          email: data.person?.email || "",
          phone: data.person?.phone || "",
          document: data.person?.document || "",
          documentType: data.person?.documentType || "DNI",
        });
      } catch (err) {
        setErrorPerfil(err.message);
      } finally {
        setCargandoPerfil(false);
      }
    })();
  }, [token]);

  const setP = (campo) => (e) => setPerfil((p) => ({ ...p, [campo]: e.target.value }));

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setErrorPerfil("");
    if (!perfil.name.trim() || !perfil.email.trim()) {
      setErrorPerfil("Nombre y email son obligatorios.");
      return;
    }
    setGuardandoPerfil(true);
    try {
      const res = await fetch(`${apiUrl}/users/me`, {
        method: "PATCH", headers: authHeaders, body: JSON.stringify(perfil),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "No se pudo guardar el perfil");
      banner.success("Perfil actualizado", {
        details: [
          ["Nombre", data.person?.name],
          ["Email", data.person?.email],
          ["Teléfono", data.person?.phone || "—"],
          ["Documento", `${data.person?.documentType || ""} ${data.person?.document || ""}`.trim() || "—"],
        ],
      });
    } catch (err) {
      setErrorPerfil(err.message);
    } finally {
      setGuardandoPerfil(false);
    }
  };

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
      const res = await fetch(`${apiUrl}/users/${user.id}/password`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ passwordActual: formData.passwordActual, passwordNueva: formData.passwordNueva }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || data.error || "Error al cambiar la contraseña");
      banner.success("Contraseña actualizada");
      setFormData({ passwordActual: "", passwordNueva: "", confirmarPassword: "" });
    } catch (err) {
      setErrorPass(err.message);
    } finally {
      setCargandoPass(false);
    }
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14 };

  return (
    <div>
      <PageHeader title="Mi Perfil" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, maxWidth: 1000 }}>
        {/* Mis datos */}
        <Card>
          <h3 style={{ color: "#475569", marginTop: 0 }}>Mis datos</h3>
          {cargandoPerfil ? (
            <p style={{ color: "#94a3b8" }}>Cargando…</p>
          ) : (
            <form onSubmit={guardarPerfil} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {errorPerfil && <div style={errBox}>{errorPerfil}</div>}
              <div>
                <label style={labelStyle}>Nombre</label>
                <input style={inputStyle} value={perfil.name} onChange={setP("name")} required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={perfil.email} onChange={setP("email")} required />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input style={inputStyle} value={perfil.phone} onChange={setP("phone")} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: "0 0 130px" }}>
                  <label style={labelStyle}>Tipo doc.</label>
                  <select style={inputStyle} value={perfil.documentType} onChange={setP("documentType")}>
                    {DOC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Documento</label>
                  <input style={inputStyle} value={perfil.document} onChange={setP("document")} />
                </div>
              </div>
              <Button type="submit" disabled={guardandoPerfil}>
                {guardandoPerfil ? "Guardando…" : "Guardar mis datos"}
              </Button>
            </form>
          )}
        </Card>

        {/* Contraseña */}
        <Card>
          <h3 style={{ color: "#475569", marginTop: 0 }}>Cambiar contraseña</h3>
          <form onSubmit={cambiarPass} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {errorPass && <div style={errBox}>{errorPass}</div>}
            <div>
              <label style={labelStyle}>Contraseña actual</label>
              <input type="password" name="passwordActual" style={inputStyle} value={formData.passwordActual} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Nueva contraseña</label>
              <input type="password" name="passwordNueva" style={inputStyle} value={formData.passwordNueva} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Confirmar nueva contraseña</label>
              <input type="password" name="confirmarPassword" style={inputStyle} value={formData.confirmarPassword} onChange={handleChange} required />
            </div>
            <Button type="submit" disabled={cargandoPass}>
              {cargandoPass ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

const labelStyle = { display: "block", marginBottom: 6, fontSize: 13, color: "#555", fontWeight: "bold" };
const errBox = { padding: "10px 12px", borderRadius: 6, backgroundColor: "#fef2f2", color: "#c62828", fontSize: 13, fontWeight: "bold" };

export default CambiarPassword;
