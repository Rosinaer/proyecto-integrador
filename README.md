# Espacio Senda — Sistema de Gestión de Turnos

Sistema de gestión de turnos para un centro de salud, desarrollado como Proyecto Integrador de 3er año.

## Tecnologías utilizadas

- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Control de versiones:** Git & GitHub

  
## Estructura del proyecto
```
/
├── estetica-backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   ├── seed2.js
│   │   ├── reset-all.js
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── utils/
│   └── app.js
│
└── estetica-frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── hooks/
    │   └── api/
    └── index.html
```

## Requisitos previos

Antes de instalar el proyecto, asegurate de tener instalado:

- [Node.js](https://nodejs.org/) (v18 o superior)
- [PostgreSQL](https://www.postgresql.org/download/) (v15 o superior)
- [Git](https://git-scm.com/)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/GabyA0714/proyecto-integrador.git
cd proyecto-integrador
```

> **Importante:** `node_modules/` y los archivos `.env` están en `.gitignore`, así que **no se clonan**. Cada persona los recrea en su máquina siguiendo estos pasos.

### 2. Configurar la base de datos

Abrí pgAdmin o psql y creá la base de datos:

```sql
CREATE DATABASE espacio_senda;
```

### 3. Configurar el Backend

```bash
cd estetica-backend
npm install
```

> **Nota:** Si `npm install` falla con errores de permisos o paquetes no encontrados, ejecutá como Administrador:
> ```bash
> Remove-Item -Recurse -Force node_modules
> Remove-Item -Force package-lock.json
> npm install
> ```
 

Creá el archivo `.env` dentro de la carpeta `estetica-backend/`:

```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/espacio_senda"
DIRECT_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/espacio_senda"
JWT_SECRET="tu_clave_secreta_aqui"
PORT=3000
```

Ejecutá las migraciones para crear las tablas:

```bash
npx prisma migrate dev --name init
```

Poblá la base de datos con los datos iniciales:

```bash
node prisma/seed.js
node prisma/seed2.js
```

Para limpiar toda la base de datos:

```bash
node prisma/reset-data.js
```

Ver la base de datos visualmente 
```bash
cd estetica-backend
npx prisma studio
```

Iniciá el servidor:

```bash
npm start
```

Tambien podes iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

### 4. Configurar el Frontend

```bash
cd ../estetica-frontend
npm install
```

> **Nota:** Si `npm install` falla, aplicá el mismo fix que en el backend (borrar `node_modules` y `package-lock.json` y volver a instalar).

Creá el archivo `.env` dentro de la carpeta `estetica-frontend/`:

```env
VITE_API_URL=http://localhost:3000/api
```

Iniciá el servidor en modo desarrollo:

```bash
npm run dev
```

## Uso

Una vez iniciados ambos servidores:

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000

### Credenciales de acceso por defecto
 
| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@espaciosenda.com | 123456 |
| Paciente (prueba) | paciente@prueba.com | 123456 |
 
> **Importante:** Estas credenciales son solo para desarrollo. Cambiálas antes de cualquier despliegue en producción.

## Funcionalidades

- Autenticación con roles (Administrador, Recepcionista, Profesional)
- Gestión de profesionales, pacientes y servicios
- Reserva y gestión de turnos
- Registro de pagos y señas
- Recordatorios automáticos
- Sincronización con Google Calendar

---
 
## Comandos frecuentes
 
Una guía rápida de qué comando usar en cada situación (todos desde `estetica-backend/`, salvo aclaración):
 
| Situación | Comando |
|---|---|
| Cambiaste el `schema.prisma` (agregaste un campo o tabla) | `npx prisma migrate dev --name descripcion_del_cambio` |
| Hiciste `git pull` y un compañero subió migraciones nuevas (agrego un campo o tabla) y la base quedo desincronizada | `npx prisma migrate dev` |
| Reinstalaste `node_modules` sin tocar el schema | `npx prisma generate` |
| Querés ver/editar los datos visualmente | `npx prisma studio` |
| Resetear los datos a cero | `node prisma/reset-data.js` |
| Levantar backend en desarrollo | `npm run dev` |
| Levantar frontend en desarrollo (desde `estetica-frontend/`) | `npm run dev` |
 
## Notas

Proyecto académico con fines educativos.
