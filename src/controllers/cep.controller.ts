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

// In-memory storage for CEP status
// TODO: Consider moving this to Redis or Database for persistence across restarts
const ceps = new Map<string, CepStatus>();

/**
 * Health check endpoint
 */
export async function healthCheck(req: Request, res: Response) {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
}

/**
 * Validates request body for CEP generation
 */
function validateCepRequest(body: any): { valid: boolean; error?: string } {
  const { email, format } = body;

  if (!email) {
    return { valid: false, error: "email es requerido" };
  }

  const validFormats = Object.values(FormatType);
  if (!validFormats.includes(format)) {
    return {
      valid: false,
      error: `Formato inválido. Valores permitidos: ${validFormats.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Shared logic for initiating a CEP generation job
 */
async function initiateCepJob(req: Request, res: Response<CepResponse | CepErrorResponse>, payload: CepRequest) {
  try {
    const cepId = generateId();
    console.log(`[INFO] Iniciando trabajo CEP: ${cepId} para ${payload.email}`);

    const cep: CepStatus = {
      cep_id: cepId,
      status: CepTypeStatus.PENDING,
      created_at: new Date().toISOString(),
      email: payload.email,
      format: payload.format,
      start_date: payload.start_date,
      end_date: payload.end_date,
    };

    ceps.set(cepId, cep);

    // Fire and forget - process in background
    cepFromDates(cepId, ceps, payload).catch((err) => {
      console.error(`[ERROR] Fallo en procesamiento de CEP ${cepId}:`, err);
      const cep = ceps.get(cepId);
      if (cep) {
        cep.status = CepTypeStatus.FAILED;
        cep.error = err.message || "Error desconocido";
        cep.completed_at = new Date().toISOString();
      }
    });

    return res.status(202).json({
      cep_id: cepId,
      message: "Trabajo iniciado correctamente",
      status: CepTypeStatus.PENDING,
    });
  } catch (error) {
    console.error(`[ERROR] Error iniciando trabajo CEP:`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error interno del servidor",
      status: CepTypeStatus.FAILED,
    });
  }
}

/**
 * Generates CEPs for yesterday
 */
export async function generateFromYesterday(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  const validation = validateCepRequest(req.body);
  if (!validation.valid) {
    console.warn(`[WARN] Solicitud inválida: ${validation.error}`);
    return res.status(400).json({ error: validation.error! });
  }

  return initiateCepJob(req, res, {
    email: req.body.email,
    format: req.body.format,
  });
}

/**
 * Generates CEPs for a specific date range
 */
export async function generateFromDateRange(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  const validation = validateCepRequest(req.body);
  if (!validation.valid) {
    console.warn(`[WARN] Solicitud inválida: ${validation.error}`);
    return res.status(400).json({ error: validation.error! });
  }

  const { start_date, end_date } = req.body;
  if (!start_date || !end_date) {
    console.warn(`[WARN] Faltan fechas en la solicitud`);
    return res.status(400).json({ error: "start_date y end_date son requeridos" });
  }

  return initiateCepJob(req, res, {
    email: req.body.email,
    format: req.body.format,
    start_date,
    end_date,
  });
}

/**
 * Gets the status of a CEP job
 */
export async function getCepStatus(req: Request, res: Response<CepStatusResponse | CepErrorResponse>) {
  try {
    const { cepId } = req.params;
    const cep = ceps.get(cepId);

    if (!cep) {
      return res.status(404).json({ error: "Trabajo no encontrado" });
    }

    const response: CepStatusResponse = {
      cep_id: cep.cep_id,
      status: cep.status,
      created_at: cep.created_at,
      completed_at: cep.completed_at,
      records_processed: cep.records_processed,
      token: cep.token,
      error: cep.status === CepTypeStatus.FAILED ? cep.error : undefined,
      download_available: cep.status === CepTypeStatus.COMPLETED && !!cep.banxico_result_path,
    };

    return res.json(response);
  } catch (error) {
    console.error(`[ERROR] Error consultando estado CEP:`, error);
    return res.status(500).json({
      error: "Error consultando estado del trabajo",
    });
  }
}

/**
 * Downloads the result file for a CEP job
 */
export async function downloadResult(req: Request, res: Response) {
  try {
    const { cepId } = req.params;
    const cep = ceps.get(cepId);

    if (!cep) {
      return res.status(404).json({ error: "Trabajo no encontrado" });
    }

    if (cep.status !== CepTypeStatus.COMPLETED) {
      return res.status(400).json({
        error: `El trabajo está en estado: ${cep.status}`,
        status: cep.status,
      });
    }

    if (!cep.banxico_result_path) {
      console.error(`[ERROR] Ruta de archivo no encontrada para CEP ${cepId}`);
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    // If it's a remote URL (Supabase Storage), redirect
    if (cep.banxico_result_path.startsWith("http")) {
      console.log(`[INFO] Redirigiendo a descarga remota para CEP ${cepId}`);
      return res.redirect(cep.banxico_result_path);
    }

    // If it's a local file, download it
    if (fs.existsSync(cep.banxico_result_path)) {
      console.log(`[INFO] Descargando archivo local para CEP ${cepId}`);
      return res.download(cep.banxico_result_path, `${cepId}.zip`, (err) => {
        if (err && !res.headersSent) {
          console.error(`[ERROR] Error enviando archivo:`, err);
          res.status(500).json({ error: "Error descargando archivo" });
        }
      });
    }

    return res.status(404).json({ error: "Archivo físico no encontrado" });
  } catch (error) {
    console.error(`[ERROR] Error en descarga:`, error);
    return res.status(500).json({
      error: "Error interno procesando descarga",
    });
  }
}

/**
 * Lists all CEP jobs
 */
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

    return res.json({
      total: cepList.length,
      ceps: cepList,
    });
  } catch (error) {
    console.error(`[ERROR] Error listando CEPs:`, error);
    return res.status(500).json({
      error: "Error obteniendo lista de trabajos",
    });
  }
}
