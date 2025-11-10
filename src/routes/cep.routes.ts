import { Router } from "express";
import multer from "multer";
import path from "path";
import * as CepController from "../controllers/ceps.controller";
import { FileManager } from "../utils/fileManager";
import { generateId } from "../utils/idGenerator";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FileManager.OUTPUTS_DIR);
  },
  filename: (req, file, cb) => {
    const jobId = generateId();
    // Guardar el jobId en req.body para usarlo después
    req.body.generatedJobId = jobId;
    cb(null, `${jobId}.txt`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".txt") {
      return cb(new Error("Solo se permiten archivos .txt"));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
});

router.post("/ceps/generate-from-dates", CepController.generateFromDates);
router.post("/ceps/generate-from-file", upload.single("file"), CepController.generateFromFile);
router.get("/ceps/:cepId/status", CepController.getCepStatus);
router.get("/ceps/:cepId/download", CepController.downloadResult);
router.get("/ceps", CepController.listCeps);

export default router;
