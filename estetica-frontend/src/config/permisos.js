export const ROLES = {
  ADMIN: "ADMIN",
  RECEPTIONIST: "RECEPTIONIST",
  PROFESSIONAL: "PROFESSIONAL",
  PATIENT: "PATIENT",
};


export const PERMISOS = {
  dashboard:            [ROLES.ADMIN],
  usuarios:             [ROLES.ADMIN],
  reportes:             [ROLES.ADMIN],
  servicios:            [ROLES.ADMIN],
  categorias:           [ROLES.ADMIN],
  serviciosProfesional: [ROLES.ADMIN],

  profesionales:        [ROLES.ADMIN, ROLES.RECEPTIONIST],
  fichaProfesional:     [ROLES.ADMIN, ROLES.RECEPTIONIST],

  agendas:              [ROLES.ADMIN, ROLES.PROFESSIONAL],

  reservaTurno:         [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL],

  // Todo el staff
  turnos:               [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL],
  calendario:           [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL],
  reprogramar:          [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL],
  pacientes:            [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL],
  miPerfil:             [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL],
};

export const PERMISOS_EDICION = {
  profesionales: [ROLES.ADMIN],                       
  pacientes:     [ROLES.ADMIN, ROLES.RECEPTIONIST], 
  servicios:     [ROLES.ADMIN],
  categorias:    [ROLES.ADMIN],
};

export const ROLES_STAFF = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PROFESSIONAL];


export const puede = (role, pagina) =>
  Array.isArray(PERMISOS[pagina]) && PERMISOS[pagina].includes(role);


export const puedeEditar = (role, recurso) =>
  Array.isArray(PERMISOS_EDICION[recurso]) && PERMISOS_EDICION[recurso].includes(role);
 
export const homePorRol = (role) => {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.PROFESSIONAL:
      return "/admin";         
    case ROLES.RECEPTIONIST:
      return "/admin/turnos";   
    default:
      return "/no-autorizado";
  }
};