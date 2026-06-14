import { createResource } from "./resource";

const recurso = createResource("professionals");

export const obtenerProfesionales = (params) => recurso.list(params);
export const obtenerProfesionalPorId = (id) => recurso.get(id);
export const crearProfesional = (data) => recurso.create(data);
export const actualizarProfesional = (id, data) => recurso.update(id, data);

export default recurso;
