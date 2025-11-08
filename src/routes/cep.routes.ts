import { Router } from "express";
import * as CepController from "../controllers/ceps.controller";

const router = Router();

router.post("/ceps-export", CepController.createCepExport);
router.get("/ceps-export/:jobId", CepController.getCepExportStatus);
router.get("/ceps-export/:jobId/download", CepController.downloadCepExportResult);
router.get("/ceps-export", CepController.listCepExports);

export default router;
