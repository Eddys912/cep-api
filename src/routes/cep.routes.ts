import { Router } from "express";
import * as CepController from "../controllers/cep.controller";
import { FileManager } from "../utils/file-manager";

// Inicializamos el sistema de archivos (carpetas necesarias) al cargar las rutas
const dirResult = FileManager.initializeDirectories();
if (dirResult.success) {
  console.log(`[INFO] Sistema de archivos para CEP inicializado`);
} else {
  console.error(`[ERROR] Fallo inicializando directorios para CEP:`, dirResult.errors);
}

const router = Router();

router.get("/health", CepController.healthCheck);
router.post("/generate", CepController.generateFromYesterday);
router.post("/generate-date", CepController.generateFromSpecificDate);
router.post("/generates-missing", CepController.generateMissing);
router.get("/status/:cepId", CepController.getCepStatus);

export default router;
