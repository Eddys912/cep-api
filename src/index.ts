import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cepRoutes from "./routes/cep.routes";
import { FileManager } from "./utils/file-manager";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

console.log("Iniciando servidor CEP API...");
console.log(`Directorios: downloads, outputs, screenshots`);
FileManager.initializeDirectories();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1", cepRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.status || 500).json({ error: err.message || "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto:${PORT}`);
});

export default app;
