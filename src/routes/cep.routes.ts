import { Router } from "express";
import * as CepController from "../controllers/cep.controller";

const router = Router();

router.get("/health", CepController.healthCheck);
router.post("/ceps/generate", CepController.generateFromYesterday);
router.post("/ceps/generate-range", CepController.generateFromDateRange);
router.get("/ceps/status/:cepId", CepController.getCepStatus);
router.get("/ceps/download/:cepId", CepController.downloadResult);
router.get("/ceps", CepController.listCeps);

export default router;
