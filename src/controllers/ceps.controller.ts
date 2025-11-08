import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { existsSync } from "fs";
import { processCepExport } from "../services/processCepExport";
import { CepRequest, CepStatus } from "../types/cep.types";
import { CepTypeStatus } from "../types/global.types";

export const cepExports = new Map<string, CepStatus>();

export async function createCepExport(req: Request, res: Response) {
  const jobId = randomUUID();
  const job: CepStatus = {
    job_id: jobId,
    status: CepTypeStatus.PENDING,
    created_at: new Date().toISOString(),
    request: req.body as CepRequest,
  };

  cepExports.set(jobId, job);
  processCepExport(jobId, cepExports, req.body as CepRequest).catch(console.error);

  res.status(202).json({
    job_id: jobId,
    status: CepTypeStatus.PENDING,
    message: "Exportación de CEPs en proceso",
  });
}

export function getCepExportStatus(req: Request, res: Response) {
  const job = cepExports.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Exportación no encontrada" });
  }
  res.json(job);
}

export function downloadCepExportResult(req: Request, res: Response) {
  const job = cepExports.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Exportación no encontrada" });
  }

  const filePath = job.banxico_result_path || job.input_file_path;
  if (!filePath || !existsSync(filePath)) {
    return res.status(404).json({ error: "Archivo de resultado no disponible" });
  }

  res.download(filePath, `ceps_${job.job_id}.zip`);
}

export function listCepExports(req: Request, res: Response) {
  const allExports = Array.from(cepExports.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, parseInt(req.query.limit as string, 10) || 10);

  res.json({ total: cepExports.size, exports: allExports });
}
