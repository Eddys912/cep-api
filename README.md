# CEP API - Banxico Automation

API RESTful desarrollada en Node.js y TypeScript para automatizar la descarga de Comprobantes Electrónicos de Pago (CEP) desde el portal de Banxico. La aplicación utiliza Playwright para la automatización web y Supabase para el almacenamiento de resultados.

## 🚀 Características

- **Automatización Robusta**: Navegación inteligente en el portal de Banxico utilizando Playwright.
- **Soporte Multi-Browser**: Fallback automático entre Chromium, Firefox y WebKit para asegurar la tasa de éxito.
- **Almacenamiento en Nube**: Subida automática de archivos (PDF/XML) a Supabase Storage con generación de URLs firmadas.
- **Arquitectura Limpia**: Código estructurado siguiendo principios SOLID, Singleton y Clean Code.
- **Docker Ready**: Configuración optimizada para despliegue en contenedores (Railway/Docker).
- **Procesamiento Asíncrono**: Manejo de colas de trabajo en memoria para no bloquear la petición HTTP.

## 🛠️ Tecnologías

- **Runtime**: Node.js v22+
- **Lenguaje**: TypeScript
- **Framework Web**: Express.js
- **Automatización**: Playwright
- **Base de Datos & Storage**: Supabase
- **Contenedorización**: Docker

## 📋 Prerrequisitos

- Node.js 22 o superior
- Cuenta en [Supabase](https://supabase.com)
- Variables de entorno configuradas

## ⚙️ Configuración e Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd cep-api
   ```
2. **Instalar dependencias**
   ```bash
   npm install
   ```
3. **Configurar Variables de Entorno**
   Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

   ```env
   PORT=3000
   NODE_ENV=development
   # Supabase
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-service-role-key
   SUPABASE_SCHEMA=public
   ```

4. **Desarrollo Local**
   ```bash
   npm run dev
   ```
5. **Compilar para Producción**
   ```bash
   npm run build
   npm start
   ```

## 🐳 Docker / Despliegue

El proyecto incluye un `Dockerfile` optimizado.

```bash
# Construir imagen
docker build -t cep-api .

# Correr contenedor
docker run -p 3000:3000 --env-file .env cep-api
```

### Notas de Despliegue (Railway)

- Asegúrate de configurar las variables de entorno en el panel de Railway.
- El Dockerfile está configurado para usar un usuario no-root (`pptruser`) por seguridad.
- La memoria (`--max_old_space_size`) está optimizada a 1024MB.

## 🔌 API Endpoints

### 1. Health Check

Verifica que el servicio esté corriendo.

- **GET** `/api/v1/health`

### 2. Generar CEPs

Inicia un trabajo de descarga de CEPs.

- **POST** `/api/v1/ceps/generate`
- **Body**:
  ```json
  {
    "email": "correo@ejemplo.com",
    "format": "pdf" | "xml" | "ambos"
  }
  ```
- **Respuesta (202 Accepted)**:
  ```json
  {
    "cep_id": "20240121-2230-XYZ",
    "message": "Trabajo iniciado correctamente",
    "status": "pending"
  }
  ```

### 3. Consultar Estado

Revisa el progreso de un trabajo.

- **GET** `/api/v1/ceps/status/:cepId`
- **Respuesta**:
  ```json
  {
    "cep_id": "...",
    "status": "completed",
    "download_available": true,
    "token": "..."
  }
  ```

### 4. Descargar Resultado

Redirige a la URL firmada de Supabase para descargar el archivo ZIP.

- **GET** `/api/v1/ceps/download/:cepId`

## 🏗️ Arquitectura del Proyecto

```
src/
├── config/         # Configuración (DB, env vars)
├── controllers/    # Controladores de rutas
├── repositories/   # Acceso a datos (Supabase Queries)
├── services/       # Lógica de negocio y automatización
│   ├── banxico-automation.service.ts  # Lógica Playwright
│   ├── banxico.service.ts             # Orquestador subida/descarga
│   └── cep.service.ts                 # Orquestador general
├── types/          # Interfaces y Enums TypeScript
├── utils/          # Utilidades (File System, Dates, IDs)
├── routes/         # Definición de rutas Express
└── index.ts        # Punto de entrada
```

## 🔍 Funcionamiento Interno

1. **Recepción**: Se recibe la petición POST y se genera un ID único.
2. **Cola**: Se añade el trabajo a un mapa en memoria (`processing`).
3. **Consulta Datos**: Se consultan los pagos en Supabase (tabla `pagos_stp_raw`).
4. **Generación TXT**: Se crea el archivo de texto requerido por Banxico en memoria/tmp.
5. **Automatización**:
   - Playwright abre un navegador (Chromium/Firefox/WebKit).
   - Sube el archivo TXT al portal de Banxico.
   - Resuelve CAPTCHAs y formularios simulando comportamiento humano.
   - Obtiene el Token de consulta.
   - Descarga el archivo ZIP resultante.
6. **Almacenamiento**:
   - El archivo ZIP se sube al bucket `cep-results` en Supabase Storage.
   - Se genera una URL firmada válida por 7 días.
   - Se limpian los archivos temporales locales.
7. **Finalización**: Se actualiza el estado del trabajo a `completed`.

## 🛡️ Seguridad y Buenas Prácticas

- Uso de `/tmp` para manejo de archivos efímeros (compatible con Serverless/Containers).
- Logs estructurados y sanitizados.
- Manejo robusto de errores con reintentos automáticos.
- Principios SOLID aplicados en servicios y controladores.
- Validación estricta de variables de entorno al inicio.
