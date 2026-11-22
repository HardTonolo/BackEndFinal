import express from "express";
import cors from "cors";
import usuarioRoutes from "./routes/usuarioRoutes";
import clienteRoutes from "./routes/clienteRoutes";
import veiculoRoutes from "./routes/veiculoRoutes";
import orcamentoRoutes from "./routes/orcamentoRoutes";
import enderecoRoutes from "./routes/enderecoRoutes";
import departamentoRoutes from "./routes/departamentoRoutes";
// ❌ REMOVIDO: authRoutes não existe mais no monólito — login agora é do microsserviço Auth (:3002)
// import authRoutes from "./routes/authRoutes";
import internalRoutes from "./routes/internalRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import metricsRoutes from "./routes/metricsRoutes";
import { observabilityMiddleware } from "./middlewares/observabilityMiddleware";
import path from "path";

const app = express();

app.use(observabilityMiddleware);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API funcionando");
});

app.use("/", metricsRoutes);

// Rotas da API (monólito)
app.use("/usuarios", usuarioRoutes);
app.use("/clientes", clienteRoutes);
app.use("/veiculos", veiculoRoutes);
app.use("/orcamentos", orcamentoRoutes);
app.use("/enderecos", enderecoRoutes);
app.use("/departamentos", departamentoRoutes);

// ❌ REMOVIDO: login agora é exclusivo do microsserviço Auth (:3002)
// app.use("/auth", authRoutes);

// Rota interna — usada pelo Auth Service para validar CLIENTE
app.use("/internal", internalRoutes);

app.use("/upload", uploadRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

export default app;