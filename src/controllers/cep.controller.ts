import { Request, Response } from "express";
import { cepFromBatch, cepFromMissing } from "../services/cep.service";
import { externalDataService } from "../services/external-data.service";
import {
  CepErrorResponse,
  CepResponse,
  CepStatus,
  CepStatusResponse,
} from "../types/cep.types";
import { CepTypeStatus, FormatType } from "../types/global.enums";
import { generateId } from "../utils/id-generator";

// In-memory storage for CEP status
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
 * Generates CEPs for yesterday
 */
export async function generateFromYesterday(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  const validation = validateCepRequest(req.body);
  if (!validation.valid) {
    console.warn(`[WARN] Solicitud inválida: ${validation.error}`);
    return res.status(400).json({ error: validation.error! });
  }

  console.log(`[INFO] Solicitando CEPs de ayer...`);
  const fetchResult = await externalDataService.fetchYesterdayCeps();

  if (!fetchResult.success || !fetchResult.data) {
    console.error(`[ERROR] Fallo al obtener lote de la API externa: ${fetchResult.error}`);
    return res.status(502).json({
      error: `Error al obtener datos de la API externa: ${fetchResult.error}`,
      status: CepTypeStatus.FAILED,
    });
  }

  const data = fetchResult.data;

  if (data.length === 0) {
    console.warn(`[WARN] No se encontraron registros para ayer`);
    return res.status(404).json({
      error: `No hay registros disponibles para ayer.`,
      status: CepTypeStatus.FAILED,
    });
  }

  try {
    let dateStr;
    if (data[0] && data[0].cadena) {
      dateStr = data[0].cadena.split(",")[0];
    }
    const cepId = generateId(dateStr);
    console.log(`[INFO] Iniciando trabajo CEP (ayer): ${cepId} para ${req.body.email}`);

    const cep: CepStatus = {
      cep_id: cepId,
      status: CepTypeStatus.PENDING,
      created_at: new Date().toISOString(),
      email: req.body.email,
      format: req.body.format,
      fecha_operacion: dateStr || undefined,
    };

    ceps.set(cepId, cep);

    // Reuse cepFromMissing since it just processes an array of cadenas
    cepFromMissing(cepId, ceps, {
      email: req.body.email,
      format: req.body.format
    }, data).catch((err) => {
      console.error(`[ERROR] Fallo en procesamiento de CEP ${cepId} (ayer):`, err);
      const cep = ceps.get(cepId);
      if (cep) {
        cep.status = CepTypeStatus.FAILED;
        cep.error = err.message || "Error desconocido";
        cep.completed_at = new Date().toISOString();
      }
    });

    return res.status(202).json({
      cep_id: cepId,
      message: `Trabajo iniciado correctamente. Registros: ${data.length}`,
      status: CepTypeStatus.PENDING,
    });
  } catch (error) {
    console.error(`[ERROR] Error iniciando trabajo CEP (ayer):`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error interno del servidor",
      status: CepTypeStatus.FAILED,
    });
  }
}

/**
 * Generates CEPs for a specific operation date by pulling from the external webhook
 */
export async function generateFromSpecificDate(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  const validation = validateCepRequest(req.body);
  if (!validation.valid) {
    console.warn(`[WARN] Solicitud inválida: ${validation.error}`);
    return res.status(400).json({ error: validation.error! });
  }

  const { fecha_operacion } = req.body;

  if (!fecha_operacion || typeof fecha_operacion !== "string") {
    return res.status(400).json({ error: "El parámetro fecha_operacion es requerido en formato YYYY-MM-DD" });
  }

  console.log(`[INFO] Solicitando lote de CEPs para fecha_operacion=${fecha_operacion}`);
  const fetchResult = await externalDataService.fetchCepsBySpecificDate(fecha_operacion);

  if (!fetchResult.success || !fetchResult.batch) {
    console.error(`[ERROR] Fallo al obtener datos de fecha específica: ${fetchResult.error}`);
    return res.status(502).json({
      error: `Error al obtener datos de la API externa: ${fetchResult.error}`,
      status: CepTypeStatus.FAILED,
    });
  }

  const batch = fetchResult.batch;

  if (batch.data.length === 0) {
    console.warn(`[WARN] No se encontraron registros en el endpoint externo para fecha_operacion=${fecha_operacion}`);
    return res.status(404).json({
      error: `No hay registros disponibles en el endpoint externo para fecha_operacion=${fecha_operacion}.`,
      status: CepTypeStatus.FAILED,
    });
  }

  try {
    const cepId = generateId(batch.fecha_operacion);
    console.log(`[INFO] Iniciando trabajo CEP (specific date): ${cepId} para ${req.body.email}`);

    const cep: CepStatus = {
      cep_id: cepId,
      status: CepTypeStatus.PENDING,
      created_at: new Date().toISOString(),
      email: req.body.email,
      format: req.body.format,
      fecha_operacion: batch.fecha_operacion,
      numero_dias_atras: batch.numero_dias_atras || 0,
    };

    ceps.set(cepId, cep);

    cepFromBatch(cepId, ceps, {
      email: req.body.email,
      format: req.body.format,
      numero_dias_atras: batch.numero_dias_atras || 0,
    }, batch).catch((err) => {
      console.error(`[ERROR] Fallo en procesamiento de CEP ${cepId} (specific date):`, err);
      const cep = ceps.get(cepId);
      if (cep) {
        cep.status = CepTypeStatus.FAILED;
        cep.error = err.message || "Error desconocido";
        cep.completed_at = new Date().toISOString();
      }
    });

    return res.status(202).json({
      cep_id: cepId,
      message: `Trabajo iniciado correctamente. Lote: fecha_operacion=${batch.fecha_operacion}, total=${batch.total}`,
      status: CepTypeStatus.PENDING,
    });
  } catch (error) {
    console.error(`[ERROR] Error iniciando trabajo CEP (specific date):`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error interno del servidor",
      status: CepTypeStatus.FAILED,
    });
  }
}

/**
 * Gets the status of a CEP job
 */
export async function getCepStatus(req: Request, res: Response<CepStatusResponse | CepErrorResponse>) {
  try {
    const { cepId } = req.params;
    const cep = ceps.get(cepId as string);

    if (!cep) {
      return res.status(404).json({ error: "Trabajo no encontrado" });
    }

    const response: CepStatusResponse = {
      cep_id: cep.cep_id,
      status: cep.status,
      created_at: cep.created_at,
      completed_at: cep.completed_at,
      fecha_operacion: cep.fecha_operacion,
      numero_dias_atras: cep.numero_dias_atras,
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
 * Generates CEPs by fetching from the missing CEPs webhook and slicing the array.
 */
export async function generateMissing(req: Request, res: Response<CepResponse | CepErrorResponse>) {
  const validation = validateCepRequest(req.body);
  if (!validation.valid) {
    console.warn(`[WARN] Solicitud inválida: ${validation.error}`);
    return res.status(400).json({ error: validation.error! });
  }

  const offset = req.body.offset !== undefined ? Number(req.body.offset) : 0;
  const limit = req.body.limit !== undefined ? Number(req.body.limit) : 500;

  if (isNaN(offset) || offset < 0) {
    return res.status(400).json({ error: "El campo 'offset' debe ser un número positivo (o cero)" });
  }

  if (isNaN(limit) || limit <= 0 || limit > 1000) {
    return res.status(400).json({ error: "El campo 'limit' debe ser un número entre 1 y 1000" });
  }

  console.log(`[INFO] Solicitando CEPs faltantes (offset: ${offset}, limit: ${limit})`);
  const fetchResult = await externalDataService.fetchMissingCeps();

  if (!fetchResult.success || !fetchResult.data) {
    console.error(`[ERROR] Fallo al obtener faltantes: ${fetchResult.error}`);
    return res.status(502).json({
      error: `Error al obtener faltantes de la API externa: ${fetchResult.error}`,
      status: CepTypeStatus.FAILED,
    });
  }

  const totalAvailable = fetchResult.data.length;
  const slicedData = fetchResult.data.slice(offset, offset + limit);

  if (slicedData.length === 0) {
    console.warn(`[WARN] No se encontraron registros faltantes en el offset ${offset}`);
    return res.status(404).json({
      error: `No hay registros faltantes disponibles en el offset ${offset}. Total disponible: ${totalAvailable}`,
      status: CepTypeStatus.FAILED,
    });
  }

  console.log(`[INFO] Lote faltantes obtenido: procesando ${slicedData.length} de ${totalAvailable}`);

  try {
    let dateStr;
    if (slicedData[0] && slicedData[0].cadena) {
      dateStr = slicedData[0].cadena.split(",")[0];
    }
    const cepId = generateId(dateStr);
    console.log(`[INFO] Iniciando trabajo CEP (faltantes): ${cepId} para ${req.body.email}`);

    const cep: CepStatus = {
      cep_id: cepId,
      status: CepTypeStatus.PENDING,
      created_at: new Date().toISOString(),
      email: req.body.email,
      format: req.body.format,
      fecha_operacion: dateStr || undefined,
    };

    ceps.set(cepId, cep);

    // Fire and forget - process in background
    cepFromMissing(cepId, ceps, {
      email: req.body.email,
      format: req.body.format,
      offset,
      limit
    }, slicedData).catch((err) => {
      console.error(`[ERROR] Fallo en procesamiento de CEP ${cepId} (faltantes):`, err);
      const cep = ceps.get(cepId);
      if (cep) {
        cep.status = CepTypeStatus.FAILED;
        cep.error = err.message || "Error desconocido";
        cep.completed_at = new Date().toISOString();
      }
    });

    return res.status(202).json({
      cep_id: cepId,
      message: `Trabajo de faltantes iniciado. Offset: ${offset}, Limit: ${limit}, Obtenidos: ${slicedData.length} de ${totalAvailable}`,
      status: CepTypeStatus.PENDING,
    });
  } catch (error) {
    console.error(`[ERROR] Error iniciando trabajo CEP (faltantes):`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Error interno del servidor",
      status: CepTypeStatus.FAILED,
    });
  }
}
