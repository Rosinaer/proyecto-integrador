import { createResource } from "./resource";

const recurso = createResource("appointments");

export const obtenerTurnos = (params) => recurso.list(params);
export const obtenerTurnoPorId = (id) => recurso.get(id);
export const crearTurno = (data) => recurso.create(data);
export const actualizarTurno = (id, data) => recurso.update(id, data);

export default recurso;
