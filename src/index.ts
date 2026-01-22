import "dotenv/config";
import express, { Express, NextFunction, Request, Response } from "express";
import { initializeDatabase } from "./config/database";
import cepRoutes from "./routes/cep.routes";
import { DatabaseErrorCode } from "./types/global.enums";
import { FileManager } from "./utils/file-manager";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const IS_DEV = process.env.NODE_ENV !== "production";

function initializeDependencies(): void {
  const dbResult = initializeDatabase();
  if (!dbResult.success) {
    console.error(`[FATAL] Error de conexión a Base de Datos:`);
    console.error(`Status: ${dbResult.error?.code}`);
    console.error(`Mensaje: ${dbResult.error?.message}`);

    if (dbResult.error?.code === DatabaseErrorCode.MISSING_CREDENTIALS && dbResult.error?.missingVars) {
      console.error(`[FATAL] Variables faltantes: ${dbResult.error.missingVars.join(", ")}`);
    }

    process.exit(1);
  }
  console.log(`[INFO] Conexión a Base de Datos establecida`);

  const dirResult = FileManager.initializeDirectories();
  if (dirResult.success) {
    console.log(`[INFO] Sistema de archivos inicializado`);
    if (dirResult.created.length > 0) {
      console.log(`[INFO] Directorios creados: ${dirResult.created.length}`);
    }
  } else {
    console.error(`[ERROR] Fallo inicializando directorios:`);
    dirResult.errors.forEach((err) => {
      console.error(`  - ${err.directory}: ${err.error}`);
    });
  }
}

function configureApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use("/api/v1", cepRoutes);

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "Error interno del servidor";

    if (status === 500) {
      console.error(`[ERROR] Uncaught Exception:`, err);
    }

    res.status(status).json({
      error: message,
      code: err.code || "INTERNAL_ERROR",
    });
  });

  return app;
}

/**
 * Starts the server
 */
function startServer() {
  console.log(`[INFO] Iniciando servidor CEP API (${process.env.NODE_ENV || "development"})...`);

  initializeDependencies();
  const app = configureApp();

  const server = app.listen(PORT, () => {
    console.log(`[INFO] Servidor corriendo en puerto: ${PORT}`);
  });

  // Graceful Shutdown
  const shutdown = () => {
    console.log("[INFO] Recibida señal de terminación. Cerrando servidor...");
    server.close(() => {
      console.log("[INFO] Servidor cerrado.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer();

export default configureApp;
