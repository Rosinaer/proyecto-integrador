-- El email deja de ser único: una misma persona puede gestionar turnos de
-- familiares reutilizando el mismo correo, y un error de tipeo no debe
-- bloquear la edición. El único identificador inmutable sigue siendo `id`.
--
-- El bloqueo de pacientes duplicados por (tipo + número de documento) se
-- valida a nivel de aplicación (patients.controller), no con un índice
-- único rígido, para que todos los campos sigan siendo editables.
DROP INDEX "people_email_key";
