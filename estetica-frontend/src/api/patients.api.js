import axios from "axios";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/patients`;

export const obtenerPacientes = async (token, search = "") => {
  const res = await axios.get(API, {
    headers: { Authorization: `Bearer ${token}` },
    params: search ? { search } : undefined,
  });
  return res.data;
};

export const obtenerPacientePorId = async (id, token) => {
  const res = await axios.get(`${API}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const crearPaciente = async (data, token) => {
  const res = await axios.post(API, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const actualizarPaciente = async (id, data, token) => {
  const res = await axios.patch(`${API}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// HISTORIAL

export const obtenerHistorialTurnos = async (id, token) => {
  const res = await axios.get(`${API}/${id}/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
export const obtenerHistorialPagos = async (id, token) => {
  const res = await axios.get(`${API}/${id}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};