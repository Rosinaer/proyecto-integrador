const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./src/routes/auth.routes");
const usuarioRoutes = require("./src/routes/usuario.routes");
const clienteRoutes = require("./src/routes/cliente.routes");
const servicioRoutes = require("./src/routes/servicio.routes");

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/cliente", clienteRoutes);
app.use("/api/servicio", servicioRoutes);

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
