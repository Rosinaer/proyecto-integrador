import { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { crearPaciente, actualizarPaciente } from "../api/patients.api";

const VACIO = { name: "", documentType: "DNI", document: "", email: "", phone: "", cuilCuit: "", clinicalNotes: "" };

const DOC_OPTIONS = [
  { value: "DNI", label: "DNI" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "CUIL", label: "CUIL" },
  { value: "CUIT", label: "CUIT" },
];

// ============================================================
// Modal reutilizable para crear o editar un paciente.
//
//   <PacienteFormModal
//     isOpen onClose token
//     paciente={paciente|null}   // si viene, entra en modo edición
//     initialName="..."          // precarga el nombre en modo alta
//     onSaved={(paciente) => ...} // se llama con el paciente devuelto por la API
//   />
//
// Única fuente de verdad para el alta/edición de pacientes: se usa tanto en
// la pestaña Pacientes como en Reservar Turno.
// ============================================================
export const PacienteFormModal = ({ isOpen, onClose, token, paciente = null, initialName = "", onSaved }) => {
  const modoEdicion = !!paciente;
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Al abrir: precargar (edición → datos del paciente; alta → initialName)
  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (paciente) {
      setForm({
        name: paciente.person?.name || "",
        documentType: paciente.person?.documentType || "DNI",
        document: paciente.person?.document || "",
        email: paciente.person?.email || "",
        phone: paciente.person?.phone || "",
        cuilCuit: paciente.cuilCuit || "",
        clinicalNotes: paciente.clinicalNotes || "",
      });
    } else {
      setForm({ ...VACIO, name: initialName || "" });
    }
  }, [isOpen, paciente, initialName]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.document.trim() || !form.phone.trim() || (!modoEdicion && !form.email.trim())) {
      setError("Completá nombre, documento, email y teléfono.");
      return;
    }
    setGuardando(true);
    try {
      const guardado = modoEdicion
        ? await actualizarPaciente(paciente.id, form, token)
        : await crearPaciente(form, token);
      onSaved?.(guardado);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modoEdicion ? "Editar Paciente" : "Crear Nuevo Paciente"}>
      {error && <p style={{ color: "red", fontSize: "14px", textAlign: "center" }}>{error}</p>}

      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "10px" }}>
        <Input type="text" placeholder="Nombre completo" value={form.name} onChange={set("name")} required />

        <Select value={form.documentType} onChange={set("documentType")} options={DOC_OPTIONS} />

        <Input type="text" placeholder="Número de documento" value={form.document} onChange={set("document")} required />

        <Input type="email" placeholder="Email" value={form.email} onChange={set("email")}
          required={!modoEdicion} disabled={modoEdicion} />

        <Input type="text" placeholder="Teléfono" value={form.phone} onChange={set("phone")} required />

        <Input type="text" placeholder="CUIL/CUIT" value={form.cuilCuit} onChange={set("cuilCuit")} />

        <Input type="text" placeholder="Notas clínicas" value={form.clinicalNotes} onChange={set("clinicalNotes")} />

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