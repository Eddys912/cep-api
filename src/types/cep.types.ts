import { CepTypeStatus, FormatType } from "./global.enums";

export interface ElectronicPayment {
  fecha_pago: string;
  clave_rastreo: string;
  clave_institucion_emisora: string;
  clave_institucion_receptora: string;
  cuenta_beneficiario: string;
  monto: string;
}

export interface CepRequest {
  email: string;
  start_date?: string;
  end_date?: string;
  format?: FormatType;
}

export interface CepStatus {
  cep_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  email: string;
  format: FormatType;
  start_date?: string;
  end_date?: string;
  records_processed?: number;
  input_file_path?: string;
  banxico_result_path?: string;
  token?: string;
  result?: {
    success: boolean;
    message: string;
    token?: string;
    download_path: string;
  };
  error?: string;
}

export interface CepResponse {
  cep_id: string;
  message: string;
  status: CepTypeStatus;
}

export interface CepStatusResponse {
  cep_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  records_processed?: number;
  token?: string;
  error?: string;
  download_available: boolean;
}

export interface CepListResponse {
  total: number;
  ceps: CepSummary[];
}

export interface CepSummary {
  cep_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  email: string;
  records_processed?: number;
}

export interface CepErrorResponse {
  error: string;
  status?: CepTypeStatus;
}
