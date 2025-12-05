import { Request, Response } from "express";
import fs from "fs";
import { cepFromDates } from "../services/cep.service";
import {
  CepErrorResponse,
  CepListResponse,
  CepRequest,
  CepResponse,
  CepStatus,
  CepStatusResponse,
} from "../types/cep.types";
import { CepTypeStatus, FormatType } from "../types/global.enums";
import { generateId } from "../utils/id-generator";

const ceps = new Map<string, CepStatus>();

export async function generateFromYesterday(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  try {
    const { email, format } = req.body;

    if (!email) return res.status(400).json({ error: "email es requerido" });

    const validFormats = Object.values(FormatType);
    if (!validFormats.includes(format))
      return res.status(400).json({ error: `Formato inválido. Valores permitidos: ${validFormats.join(", ")}` });

    const cepId = generateId();

    const cep: CepStatus = {
      cep_id: cepId,
      status: CepTypeStatus.PENDING,
      created_at: new Date().toISOString(),
      email,
      format,
    };

    ceps.set(cepId, cep);

    const payload: CepRequest = { email, format };
    cepFromDates(cepId, ceps, payload).catch((err) => {
      const cep = ceps.get(cepId);
      if (cep) {
        cep.status = CepTypeStatus.FAILED;
        cep.error = err.message;
        cep.completed_at = new Date().toISOString();
      }
    });

    const response: CepResponse = {
      cep_id: cepId,
      message: "Trabajo iniciado",
      status: cep.status,
    };

    return res.status(202).json(response);
  } catch (error) {
    console.error("Error en generateFromYesterday:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

export async function generateFromDateRange(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  try {
    const { email, format, start_date, end_date } = req.body;

    if (!email) return res.status(400).json({ error: "email es requerido" });
    if (!start_date) return res.status(400).json({ error: "start_date es requerido" });
    if (!end_date) return res.status(400).json({ error: "end_date es requerido" });

    const validFormats = Object.values(FormatType);
    if (!validFormats.includes(format))
      return res.status(400).json({ error: `Formato inválido. Valores permitidos: ${validFormats.join(", ")}` });

    const cepId = generateId();

    const cep: CepStatus = {
      cep_id: cepId,
      status: CepTypeStatus.PENDING,
      created_at: new Date().toISOString(),
      email,
      format,
      start_date,
      end_date,
    };

    ceps.set(cepId, cep);

    const payload: CepRequest = { email, format, start_date, end_date };
    cepFromDates(cepId, ceps, payload).catch((err) => {
      console.error(`Error procesando cep ${cepId}:`, err);
      const cep = ceps.get(cepId);
      if (cep) {
        cep.status = CepTypeStatus.FAILED;
        cep.error = err.message || "Error desconocido";
        cep.completed_at = new Date().toISOString();
      }
    });

    const response: CepResponse = {
      cep_id: cepId,
      message: "Trabajo iniciado",
      status: cep.status,
    };

    return res.status(202).json(response);
  } catch (error) {
    console.error("Error en generateFromDates:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

export async function getCepStatus(req: Request, res: Response<CepStatusResponse | CepErrorResponse>) {
  try {
    const { cepId } = req.params;
    const cep = ceps.get(cepId);

    if (!cep) return res.status(404).json({ error: "Trabajo no encontrado" });

    const response: CepStatusResponse = {
      cep_id: cep.cep_id,
      status: cep.status,
      created_at: cep.created_at,
      completed_at: cep.completed_at,
      records_processed: cep.records_processed,
      token: cep.token,
      error: cep.error,
      download_available: cep.status === CepTypeStatus.COMPLETED && !!cep.banxico_result_path,
    };

    return res.json(response);
  } catch (error) {
    console.error("Error en getcepStatus:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Error desconocido" });
  }
}

export async function downloadResult(req: Request, res: Response) {
  try {
    const { cepId } = req.params;
    const cep = ceps.get(cepId);

    if (!cep) return res.status(404).json({ error: "Trabajo no encontrado" });

    if (cep.status !== CepTypeStatus.COMPLETED) {
      const errorResponse: CepErrorResponse = {
        error: `El trabajo está en estado: ${cep.status}`,
        status: cep.status,
      };
      return res.status(400).json(errorResponse);
    }

    if (!cep.banxico_result_path || !fs.existsSync(cep.banxico_result_path))
      return res.status(404).json({ error: "Archivo no encontrado" });

    return res.download(cep.banxico_result_path, `${cepId}.zip`, (err) => {
      if (err) if (!res.headersSent) res.status(500).json({ error: "Error descargando archivo" });
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

export async function listCeps(req: Request, res: Response<CepListResponse | CepErrorResponse>) {
  try {
    const cepList = Array.from(ceps.values()).map((cep) => ({
      cep_id: cep.cep_id,
      status: cep.status,
      created_at: cep.created_at,
      completed_at: cep.completed_at,
      email: cep.email,
      records_processed: cep.records_processed,
    }));

    const response: CepListResponse = {
      total: cepList.length,
      ceps: cepList,
    };

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}
