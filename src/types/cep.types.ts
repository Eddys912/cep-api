import { CepTypeStatus, FormatType } from "./global.enums";

/**
 * Electronic payment record from Supabase
 */
export interface ElectronicPayment {
  fecha_pago: string;
  clave_rastreo: string;
  clave_institucion_emisora: string;
  clave_institucion_receptora: string;
  cuenta_beneficiario: string;
  monto: string;
}

/**
 * Single cadena item from the external API response
 */
export interface CadenaCep {
  cadena: string;
}

/**
 * Response from the external API get-cadenas-cep
 */
export interface ExternalBatchResponse {
  numero_dias_atras: number;
  fecha_operacion: string;
  total: number;
  data: CadenaCep[];
}

/**
 * Record for storing a CEP batch/lote in the database
 */
export interface CepBatchRecord {
  id?: string;
  fecha_operacion: string;
  numero_dias_atras: number;
  total: number;
  cadenas: string[];
  created_at?: string;
}

/**
 * Request payload for CEP generation
 */
export interface CepRequest {
  email: string;
  format: FormatType;
  start_date?: string;
  end_date?: string;
}

/**
 * Request payload for CEP generation by days (batch mode)
 */
export interface CepDaysRequest {
  email: string;
  format: FormatType;
  numero_dias_atras: number;
}

/**
 * Internal status tracking for CEP jobs
 */
export interface CepStatus {
  cep_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  email: string;
  format: FormatType;
  start_date?: string;
  end_date?: string;
  fecha_operacion?: string;
  numero_dias_atras?: number;
  records_processed?: number;
  input_file_path?: string;
  banxico_result_path?: string;
  token?: string;
  error?: string;
}

/**
 * Response for CEP generation request
 */
export interface CepResponse {
  cep_id: string;
  message: string;
  status: CepTypeStatus;
}

/**
 * Response for CEP status query
 */
export interface CepStatusResponse {
  cep_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  fecha_operacion?: string;
  numero_dias_atras?: number;
  records_processed?: number;
  token?: string;
  error?: string;
  download_available: boolean;
}

/**
 * Response for listing all CEPs
 */
export interface CepListResponse {
  total: number;
  ceps: CepSummary[];
}

/**
 * Summary information for a CEP job
 */
export interface CepSummary {
  cep_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  email: string;
  records_processed?: number;
  fecha_operacion?: string;
}

/**
 * Error response format
 */
export interface CepErrorResponse {
  error: string;
  code?: string;
  status?: CepTypeStatus;
}
