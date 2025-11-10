import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import cepRoutes from "./routes/cep.routes";
import { FileManager } from "./utils/fileManager";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

FileManager.initializeDirectories();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FileManager.OUTPUTS_DIR);
  },
  filename: (req, file, cb) => {
    const { generateCepId } = require("./utils/idGenerator");
    const cepId = generateCepId();
    cb(null, `${cepId}.txt`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".txt") return cb(new Error("Solo se permiten archivos .txt"));
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("upload", upload);
app.use("/api", cepRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ error: err.message || "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto:${PORT}`);
});

export default app;
