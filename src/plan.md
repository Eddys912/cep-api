# Plan de Desarrollo: Microservicio CEP

Este documento establece el plan de trabajo para el desarrollo desde cero del microservicio
encargado de la generación y gestión de CEPs. El objetivo es un proyecto limpio, testeable, bien
configurado y que aplique principios como KISS, SRP y YAGNI.

## 1. Stack Tecnológico Seleccionado

Se ha priorizado un enfoque simple pero robusto:

- **Express.js + TSOA:**. Mantener la ligereza de Express, rutas tipadas, validación básica y
  generación automática de la documentación de Swagger.
- **Pino:** (junto con `pino-pretty` en desarrollo). Emite logs estructurados para observabilidad.
- **Swagger:** (UI generado vía TSOA).
- **Playwright:**. Para la interacción y descargas con Banxico.
- **Zod:**. Validar estructura de datos antes de que lleguen a los servicios.
- **Vitest:** Pruebas unitarias sobre los servicios y lógica de integración.
- **Integración de Datos:** Actuará comunicándose directamente con una **API Externa**.

## 2. Estandarización y Configuración Base

Para garantizar la calidad del código y la compatibilidad entre desarrolladores/entornos, el nuevo
directorio deberá arrancar con:

1. `.editorconfig`: Estandarizar tamaños de indentación sin importar el IDE.
2. `.prettierrc` y `.prettierignore`: Para el formateo automático de código.
3. `.gitattributes`: Para forzar saltos de línea LF
4. `.gitignore`: Para evitar subir dependencias, variables de entorno y artefactos de compilación.
5. `.env`: Nada de valores hardcodeados. Todas las URLs de las APIs a consumir, tokens, puertos de
  escucha, y configuraciones de Playwright (timeout, headful/headless).

## 3. Arquitectura (Capa de Servicios)

Se estructurará en capas simples, evitando la complejidad excesiva pero manteniendo separación:

- **Capa de Presentación (TSOA Controllers):** Reciben la petición HTTP, invocan las validaciones de
  Zod, llaman a la capa de Servicios y retornan las respuestas HTTP adecuadas de manera uniforme.
- **Capa de Servicios (`services/`):** Contienen toda la lógica de negocio.
  (Ej. `CepGenerationService`). Reciben parámetros limpios y devuelven resultados.
- **Capa de Integración (`integrations/`):**
  - `BanxicoScraper`: Aísla todo el código de Playwright.
  - `ExternalApiClient`: Servicio responsable de hacer llamadas HTTP (ej. con Fetch o Axios) a la
    nueva API externa (la que sustituye a Supabase) para reportar estados y enviar resultados.

## 4. Diseño de la API (Endpoints)

Solo se implementarán los siguientes 5 endpoints bajo el estándar definido:

| Endpoint             | Método | Responsabilidad                                                 |
| -------------------- | ------ | --------------------------------------------------------------- |
| `/health`            | `GET`  | Verifica que el microservicio está vivo y capaz de responder.   |
| `/generate`          | `POST` | Generación batch general (comportamiento por defecto).          |
| `/generate-date`     | `POST` | Generación de CEPs para una fecha exacta proporcionada.         |
| `/generates-missing` | `POST` | Activación del reprocesamiento/recuperación de CEPs faltantes.  |
| `/status/:cepId`     | `GET`  | Consulta a la API externa sobre el estado de un CEP específico. |

## 5. Fases de Ejecución

### Fase 1: Inicialización del Proyecto (Directorio Nuevo)

- Crear carpeta vacía.
- `pnpm init` y `npx tsc --init`.
- Crear `.editorconfig`, `.prettierrc`, `.gitattributes`, `.gitignore`.
- Instalar dependencias base (`express`, `tsoa`, `swagger-ui-express`, `pino`, `zod`, `playwright`,
  `dotenv`, `vitest`).

### Fase 2: Configuración Core

- Configurar el módulo que cargará y validará estrictamente las variables del `.env`.
- Configurar el logger (Pino) global.
- Configurar TSOA y exponer `/api/docs` con Swagger UI.

### Fase 3: Integraciones

- Crear el adaptador de **Playwright** para la navegación y descarga en Banxico.
- Crear el cliente para consumir la **API Externa**.
- *Ambos deben ser configurables mediante variables de entorno.*

### Fase 4: Lógica de Servicios y Pruebas

- Desarrollar los servicios que orquestan las integraciones.
- Escribir **pruebas unitarias** usando Vitest (haciendo mocks del scraper y de la API externa) para
  garantizar que la lógica de reintento, formato y validación funcione.

### Fase 5: Exposición de Endpoints

- Implementar los Controladores TSOA que ligan las rutas web con los servicios.
- Verificar que la documentación Swagger refleje exactamente los parámetros requeridos.
