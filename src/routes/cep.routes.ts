import { Router } from "express";
import * as CepController from "../controllers/cep.controller";

const router = Router();

router.get("/health", CepController.healthCheck);
router.post("/generate", CepController.generateFromYesterday);
router.post("/generate-date", CepController.generateFromSpecificDate);
router.post("/generates-missing", CepController.generateMissing);
router.get("/status/:cepId", CepController.getCepStatus);

export default router;
