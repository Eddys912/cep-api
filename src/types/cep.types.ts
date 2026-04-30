import { CepTypeStatus, FormatType } from './global.enums';

/**
 * Parsed row for Banxico TXT output (comma-separated chain line).
 * Internal contract — Spanish field names only on external API payloads.
 */
export interface BanxicoTxtRow {
  paymentDate: string;
  trackingKey: string;
  senderInstitutionCode: string;
  receiverInstitutionCode: string;
  beneficiaryAccount: string;
  amount: string;
}

/**
 * Normalized chain item after mapping external.
 */
export interface CepChainItem {
  chain: string;
}

/**
 * Response from the external API get-cadenas-cep (Spanish keys as returned by the provider).
 */
export interface ExternalBatchResponse {
  numero_dias_atras: number;
  fecha_operacion: string;
  total: number;
  data: unknown[];
}

/**
 * Canonical internal contract for CEP batches.
 */
export interface InternalCepBatch {
  operationDate: string;
  total: number;
  payments: CepChainItem[];
  daysBack?: number;
}

/**
 * Request payload for CEP generation by days (batch mode)
 */
export interface CepDaysRequest {
  email: string;
  format: FormatType;
  daysBack: number;
}

/**
 * Request payload for processing missing CEPs
 */
export interface CepMissingRequest {
  email: string;
  format: FormatType;
  offset?: number;
  limit?: number;
}

/**
 * Internal status tracking for CEP jobs
 */
export interface CepStatus {
  cepId: string;
  status: CepTypeStatus;
  createdAt: string;
  completedAt?: string;
  email: string;
  format: FormatType;
  startDate?: string;
  endDate?: string;
  operationDate?: string;
  daysBack?: number;
  recordsProcessed?: number;
  inputFilePath?: string;
  banxicoResultPath?: string;
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
  operation_date?: string;
  days_back?: number;
  records_processed?: number;
  token?: string;
  error?: string;
  download_available: boolean;
}

/**
 * Error response format
 */
export interface CepErrorResponse {
  error: string;
  code?: string;
  status?: CepTypeStatus;
}
