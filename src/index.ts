import "dotenv/config";
import express from "express";
import { mkdir } from "fs/promises";
import routes from "./routes/cep.routes";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use(routes);

mkdir("outputs", { recursive: true }).catch(console.error);

app.listen(PORT, () => {
  console.log(`✅ API corriendo en el puerto:${PORT}`);
});
