export async function validateTxtFile(filepath: string): Promise<boolean> {
  const fs = require("fs/promises");
  const content = await fs.readFile(filepath, "utf8");
  const lines = content.trim().split("\n");

  if (lines.length === 0) throw new Error("El archivo está vacío");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length !== 6) {
      throw new Error(`Línea ${i + 1}: Formato inválido. Se esperan 6 campos separados por comas`);
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(parts[0]))
      throw new Error(`Línea ${i + 1}: Fecha inválida "${parts[0]}". Formato esperado: YYYY-MM-DD`);

    const amountRegex = /^-?\d+(\.\d+)?$/;
    if (!amountRegex.test(parts[5])) throw new Error(`Línea ${i + 1}: Monto inválido "${parts[5]}"`);
  }

  return true;
}
