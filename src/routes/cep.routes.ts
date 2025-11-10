import { Router } from "express";
import * as CepController from "../controllers/cep.controller";

const router = Router();

router.post("/ceps/generate", CepController.generateFromYesterday);
router.post("/ceps/generate-range", CepController.generateFromDateRange);
router.get("/ceps/:cepId/status", CepController.getCepStatus);
router.get("/ceps/:cepId/download", CepController.downloadResult);
router.get("/ceps", CepController.listCeps);

export default router;
