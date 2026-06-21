# Espacio Senda — Sistema de Gestión de Turnos

Aplicación web para la gestión de turnos de un centro de salud y estética. Permite administrar pacientes, profesionales, servicios, agendas y turnos; registrar pagos y reembolsos; generar reportes; sincronizar los turnos con Google Calendar y enviar recordatorios automáticos por correo.

El proyecto está dividido en dos aplicaciones independientes que se comunican mediante una API REST sobre HTTP (JSON):

- **`estetica-backend`** — API REST en Node.js + Express, con Prisma ORM sobre PostgreSQL.
- **`estetica-frontend`** — SPA en React (Vite).

## Stack tecnológico

**Backend**
- Node.js + Express 5 (API REST)
- PostgreSQL + Prisma ORM 5 (acceso a datos y migraciones)
- JSON Web Token (autenticación) y bcrypt (cifrado de contraseñas)
- express-rate-limit (protección anti fuerza bruta)
- googleapis (sincronización con Google Calendar)
- Nodemailer / Brevo (envío de correos)
- node-cron (tareas programadas: recordatorios y reintentos de sincronización)
- Swagger (swagger-jsdoc + swagger-ui-express) para documentar la API
- Jest + Supertest (pruebas unitarias y de integración)

**Frontend**
- React 19 (SPA)
- React Router DOM 7 (ruteo)
- axios (cliente HTTP hacia la API)
- Vite 8 (empaquetado y servidor de desarrollo)
- CSS plano con variables nativas y un theme de colores centralizado

## Estructura del repositorio

```
estetica-backend/
  prisma/             Esquema (schema.prisma), migraciones y datos de prueba (seed.js)
  src/
    routes/           Definición de los endpoints
    controllers/      Lógica de cada endpoint
    services/         Lógica de negocio compleja (disponibilidad, turnos, sincronización)
    middleware/       Autenticación (verificarToken) y autorización (autorizarRoles)
    utils/            Zona horaria, normalización de teléfonos, recordatorios, sincronización
    config/           Cliente Prisma, Swagger, Google, mailer
    docs/             Documentación Swagger de la API
  tests/unit/         Pruebas unitarias
  tests/integration/  Pruebas de integración
  app.js              Punto de entrada

estetica-frontend/
  src/
    pages/            Pantallas (Turnos, Pacientes, Profesionales, Servicios, Reportes, etc.)
    components/       Componentes reutilizables
    api/              Cliente axios centralizado
    hooks/            Hooks personalizados (contexto de autenticación)
    utils/            Formato de moneda, fechas y teléfonos
    constants/        Estados de turno, pago y sincronización
    theme/            Estilos base y paleta de colores
```

## Requisitos previos

- Node.js 18 o superior y npm
- PostgreSQL 14 o superior (local o en la nube, por ejemplo Supabase o Neon)
- Git

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/GabyA0714/proyecto-integrador.git
cd proyecto-integrador
```

> **Importante:** `node_modules/` y los archivos `.env` están en `.gitignore`, así que **no se clonan**. Cada persona los recrea en su máquina siguiendo estos pasos.

### 2. Configurar la base de datos

Crear la base de datos desde pgAdmin o psql (omitir este paso si se usa una base administrada en la nube como Supabase o Neon, donde la base ya existe):

```sql
CREATE DATABASE espacio_senda;
```

Luego cargar la cadena de conexión en `DATABASE_URL` (y `DIRECT_URL` si corresponde) dentro del `.env` del backend.

### 3. Backend

```bash
cd estetica-backend
npm install
# Crear el archivo .env (ver sección "Variables de entorno"). No se sube a Git.
npx prisma generate        # Genera el cliente de Prisma
npx prisma migrate deploy  # Crea las tablas en la base
node prisma/seed.js        # Carga los datos de prueba
node prisma/seed2.js       # Carga mas datos de prueba
npm run dev                # Levanta el servidor (http://localhost:3000)
```

### 4. Frontend

```bash
cd estetica-frontend
npm install
# Crear el archivo .env con:  VITE_API_URL=http://localhost:3000/api
npm run dev                # Levanta la SPA (http://localhost:5173)
```

## Variables de entorno (backend)

Solo `DATABASE_URL` y `JWT_SECRET` son imprescindibles para que la aplicación arranque. El resto habilita el correo y la sincronización con Google Calendar; sin ellas, el sistema funciona igual: la sincronización queda en estado `PENDING` y el envío de correos se desactiva.

Cuando la base se aloja en Supabase con *connection pooling*, `DATABASE_URL` apunta al pooler (puerto 6543) y `DIRECT_URL` a la conexión directa (puerto 5432), necesaria para aplicar migraciones.

```dotenv
# Base de datos
DATABASE_URL="postgresql://usuario:password@host:6543/postgres"   # pooled (Supabase)
DIRECT_URL="postgresql://usuario:password@host:5432/postgres"     # directa (migraciones)

# Seguridad / app
JWT_SECRET="clave_secreta"
PORT=3000
FRONTEND_URL="http://localhost:5173"

# Correo (recordatorios y recuperación de contraseña)
EMAIL_USER=
EMAIL_PASS=
ALTERNATIVE_MAILER=false        # true para usar Brevo (API HTTP) en lugar de SMTP
BREVO_API_KEY=

# Google Calendar
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=
GOOGLE_CALENDAR_TZ=America/Argentina/Buenos_Aires
```

> Las credenciales no se incluyen en el repositorio (`.env` está excluido por `.gitignore`). Quien continúe el desarrollo debe generar las suyas. Ver la sección **Integraciones externas**.

## Credenciales de prueba

El seed crea un usuario administrador:

- **Email:** `admin@espaciosenda.com`
- **Contraseña:** `123456`

También crea un usuario de recepción y uno de paciente con la misma contraseña.

## Documentación de la API (Swagger)

Con el backend en ejecución, la documentación interactiva está disponible en:

```
http://localhost:3000/api/docs
```

Los endpoints protegidos requieren token JWT: obtenerlo desde `POST /api/auth/login` y cargarlo con el botón **Authorize** (esquema *bearerAuth*) para probar rutas privadas.

### Rutas principales

| Prefijo | Módulo |
| --- | --- |
| `/api/auth` | Login, registro de pacientes y recuperación de contraseña |
| `/api/users` | Gestión de usuarios y roles |
| `/api/patients` | Pacientes e historial |
| `/api/professionals` | Profesionales, agendas, disponibilidad y bloqueos |
| `/api/services` | Categorías, servicios y precio/duración por profesional |
| `/api/appointments` | Reserva, reprogramación y cambios de estado de turnos |
| `/api/payments` | Pagos, reembolsos e historial financiero |
| `/api/reports` | Reportes de ingresos, turnos y servicios |
| `/api/reminders` | Recordatorios automáticos |
| `/api/google` | Sincronización con Google Calendar |

## Estados de turno

Los turnos avanzan por los siguientes estados: `PENDING` (Pendiente), `CONFIRMED` (Confirmado), `IN_PROGRESS` (En curso), `COMPLETED` (Completado), `CANCELLED` (Cancelado) y `NO_SHOW` (No asistió). Los estados `CANCELLED` y `NO_SHOW` se consideran cierres del turno.

El estado de pago es independiente del estado del turno: `PENDING`, `PARTIAL`, `COMPLETED`, `REFUNDED`. Al reservar, el precio se congela (`priceSnapshot`) para que cambios posteriores de tarifas no afecten turnos ya registrados.

## Integraciones externas

Estas integraciones requieren credenciales personales que **no** se distribuyen con el proyecto.

### Google Calendar

La sincronización usa una **cuenta de servicio** de Google Cloud (autenticación JWT, no OAuth interactivo). Para configurarla:

1. Crear un proyecto en Google Cloud y habilitar la API de Google Calendar.
2. Generar una cuenta de servicio y descargar su clave privada.
3. Compartir el calendario de destino con el email de la cuenta de servicio, con permisos de edición.
4. Completar `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` y `GOOGLE_CALENDAR_ID`.

Cada entorno escribe en un calendario distinto según `GOOGLE_CALENDAR_ID`. Si una sincronización falla, el turno se guarda igual y queda en estado `PENDING`/`FAILED`; una tarea `node-cron` reintenta los pendientes cada 15 minutos, de modo que un fallo externo nunca bloquea la operación.

### Correo

Por defecto se usa SMTP de Gmail mediante Nodemailer (`EMAIL_USER` y `EMAIL_PASS`, esta última una contraseña de aplicación de Gmail). Como alternativa puede usarse Brevo vía su API HTTP, configurando `ALTERNATIVE_MAILER=true` y `BREVO_API_KEY`.

> **Recordatorios en producción (Render):** el envío por SMTP funciona en el entorno local, pero el plan gratuito de Render bloquea las conexiones SMTP salientes, por lo que Nodemailer no puede enviar desde el backend desplegado. 

## Despliegue

El sistema está desplegado con cada capa en un servicio independiente:

- **Frontend:** Vercel
- **Backend / API:** Render
- **Base de datos:** Supabase (PostgreSQL administrado en la nube)

> En el plan gratuito de Render, el backend puede tardar entre 30 y 60 segundos en responder la primera petición tras un período de inactividad, ya que el servicio se suspende cuando no recibe tráfico.

## Pruebas

```bash
npm run test              # Todas las pruebas
npm run test:unit         # Solo unitarias (funciones aisladas, sin base de datos)
npm run test:integration  # Solo de integración (HTTP → middleware → controlador → Prisma → DB)
```

Las pruebas unitarias cubren la normalización de teléfonos y el manejo de zona horaria. Las de integración cubren la autenticación, el control de autorización por rol y el ciclo CRUD de los módulos centrales.

## Zona horaria

Todo el sistema opera en `America/Argentina/Buenos_Aires`. Las fechas se almacenan en formato `TIMESTAMPTZ` y el scheduler de recordatorios respeta esta zona horaria para evitar envíos en horarios incorrectos.
