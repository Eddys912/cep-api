import { CepTypeStatus, FormatType } from "./global.types";

export interface PagoElectronico {
  fecha_pago: string;
  clave_rastreo: string;
  clave_institucion_emisora: string;
  clave_institucion_receptora: string;
  cuenta_beneficiario: string;
  monto: string;
}

export interface CepRequest {
  email: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  formato?: FormatType;
}

export interface CepStatus {
  job_id: string;
  status: CepTypeStatus;
  created_at: string;
  completed_at?: string;
  request: CepRequest;
  records_processed?: number;
  input_file_path?: string;
  banxico_result_path?: string;
  token?: string;
  result?: {
    success: boolean;
    message: string;
    token?: string;
    downloadPath: string;
  };
  error?: string;
}
