import { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { useBanner } from "./ui/Banner";
import { crearPaciente, actualizarPaciente } from "../api/patients.api";

const VACIO = { name: "", documentType: "DNI", document: "", email: "", phone: "", cuilCuit: "", clinicalNotes: "" };

const DOC_OPTIONS = [
  { value: "DNI", label: "DNI" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "OTHER", label: "Otro" },
];

const DOC_LABEL = { DNI: "DNI", PASSPORT: "Pasaporte", OTHER: "Otro" };

// Campo con label y asterisco para obligatorios
const Campo = ({ label, requerido, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
    <label style={{ color: "#6a1b9a", fontWeight: "bold", fontSize: 14 }}>
      {label} {requerido && <span style={{ color: "#d32f2f" }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = { width: "100%", boxSizing: "border-box" };


export const PacienteFormModal = ({ isOpen, onClose, token, paciente = null, initialName = "", onSaved }) => {
  const modoEdicion = !!paciente;
  const banner = useBanner();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmData, setConfirmData] = useState(null); 

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setConfirmData(null);
    if (paciente) {
      setForm({
        name: paciente.person?.name || "",
        documentType: paciente.person?.documentType || "DNI",
        document: paciente.person?.document || "",
        email: paciente.person?.email || "",
        phone: paciente.person?.phone || "",
        cuilCuit: paciente.person?.cuilCuit || "",
        clinicalNotes: paciente.clinicalNotes || "",
      });
    } else {
      setForm({ ...VACIO, name: initialName || "" });
    }
  }, [isOpen, paciente, initialName]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));


  const trasGuardar = (guardado) => {
    const p = guardado?.person || {};
    banner.success(modoEdicion ? "Paciente actualizado" : "Paciente creado", {
      details: [
        ["Nombre", p.name || form.name],
        ["Documento", `${DOC_LABEL[p.documentType || form.documentType] || ""} ${p.document || form.document}`.trim()],
        ["Email", p.email || form.email || "—"],
        ["Teléfono", p.phone || form.phone || "—"],
        ["CUIL/CUIT", p.cuilCuit || form.cuilCuit || "—"],
      ],
      notes: (guardado?.clinicalNotes || form.clinicalNotes) || "",
    });
    onSaved?.(guardado);
    onClose?.();
  };

  const doSave = async (confirmLink = false) => {
    setError("");
    setGuardando(true);
    try {
      const payload = confirmLink ? { ...form, confirmLink: true } : form;
      const guardado = modoEdicion
        ? await actualizarPaciente(paciente.id, payload, token)
        : await crearPaciente(payload, token);
      trasGuardar(guardado);
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsConfirmation) {
        setConfirmData(data); 
      } else {
        setError(data?.mensaje || err.message);
      }
    } finally {
      setGuardando(false);
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.document.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("Completá los campos obligatorios (marcados con *).");
      return;
    }
    doSave(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modoEdicion ? "Editar Paciente" : "Crear Nuevo Paciente"}>
      {error && <p style={{ color: "red", fontSize: "14px", textAlign: "center" }}>{error}</p>}

      {confirmData && (
        <div style={{ border: "1px solid #fde047", background: "#fef9c3", color: "#854d0e", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>{confirmData.mensaje}</div>
          {confirmData.person && (
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              {confirmData.person.name} · {confirmData.person.email || "sin email"}
              {confirmData.person.isProfessional ? " · ya es profesional" : ""}
              {confirmData.person.isUser ? " · ya es usuario" : ""}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={() => setConfirmData(null)}>
              No, revisar
            </Button>
            <Button type="button" disabled={guardando} onClick={() => doSave(true)}>
              {guardando ? "Asociando..." : "Sí, asociar como paciente"}
            </Button>
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 4px" }}>
        Los campos marcados con <span style={{ color: "#d32f2f" }}>*</span> son obligatorios.
      </p>

      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
        <Campo label="Nombre completo" requerido>
          <input type="text" placeholder="Nombre completo" value={form.name} onChange={set("name")} style={inputStyle} required />
        </Campo>

        <Campo label="Tipo de documento" requerido>
          <Select value={form.documentType} onChange={set("documentType")} options={DOC_OPTIONS} />
        </Campo>

        <Campo label="Número de documento" requerido>
          <input type="text" placeholder="Número de documento" value={form.document} onChange={set("document")} style={inputStyle} required />
        </Campo>

        <Campo label="Email" requerido>
          <input type="email" placeholder="Email" value={form.email} onChange={set("email")} style={inputStyle} required />
        </Campo>

        <Campo label="Teléfono" requerido>
          <input type="text" placeholder="Teléfono" value={form.phone} onChange={set("phone")} style={inputStyle} required />
        </Campo>

        <Campo label="CUIL/CUIT">
          <input type="text" placeholder="CUIL/CUIT" value={form.cuilCuit} onChange={set("cuilCuit")} style={inputStyle} />
        </Campo>

        <Campo label="Notas clínicas">
          <input type="text" placeholder="Notas clínicas" value={form.clinicalNotes} onChange={set("clinicalNotes")} style={inputStyle} />
        </Campo>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
          <Button type="button" style={{ backgroundColor: "#e2e8f0", color: "#475569" }} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar Paciente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PacienteFormModal;
