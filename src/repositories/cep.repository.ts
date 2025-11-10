import { supabase } from "../config/database";

export class CepRepository {
  async getCepsByDate(date: string) {
    const { data, error } = await supabase
      .from("pagos_stp_raw")
      .select(
        `
        fecha_pago: fecha_operacion,
        clave_rastreo: claverastreo,
        clave_institucion_emisora: institucion_ordenante,
        clave_institucion_receptora: institucion_beneficiaria,
        cuenta_beneficiario,
        monto
      `
      )
      .eq("fecha_operacion", date);

    if (error) throw error;
    return data;
  }

  async getCepsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("pagos_stp_raw")
      .select(
        `
        fecha_pago: fecha_operacion,
        clave_rastreo: claverastreo,
        clave_institucion_emisora: institucion_ordenante,
        clave_institucion_receptora: institucion_beneficiaria,
        cuenta_beneficiario,
        monto
      `
      )
      .gte("fecha_operacion", startDate)
      .lte("fecha_operacion", endDate);

    if (error) throw error;
    return data;
  }
}

export const cepRepository = new CepRepository();
