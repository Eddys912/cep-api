# Guía de Configuración - n8n Workflow para CEP API

## 📋 Descripción General

Este workflow de n8n automatiza completamente el proceso de generación y descarga de Comprobantes Electrónicos de Pago (CEP) desde Banxico, consumiendo la API desarrollada en este proyecto.

## 🎯 Características del Workflow

### ✅ Funcionalidades Implementadas

1. **Doble Trigger**:
   - **Schedule Trigger**: Ejecución automática diaria a las 8:00 AM
   - **Webhook Trigger**: Ejecución manual mediante HTTP POST

2. **Validación Robusta**:
   - Validación de formato de email
   - Validación de formato (pdf, xml, ambos)
   - Validación de rangos de fechas
   - Manejo de errores de validación

3. **Polling Inteligente**:
   - Consulta automática del estado cada 10 segundos
   - Máximo 60 intentos (10 minutos de timeout)
   - Detección automática de completado/error

4. **Manejo de Excepciones**:
   - Reintentos automáticos en llamadas HTTP (3 intentos)
   - Timeouts configurables
   - Manejo de errores en cada etapa
   - Logging detallado

5. **Notificaciones Múltiples**:
   - Email (éxito y error)
   - Slack (opcional)
   - Respuesta a webhook
   - Auditoría completa

6. **Descarga y Almacenamiento**:
   - Descarga automática del ZIP resultante
   - Guardado en disco local
   - Opción de subir a almacenamiento en nube

## 🔧 Configuración Inicial

### 1. Variables de Entorno en n8n

Configura las siguientes variables de entorno en tu instancia de n8n:

```bash
# API Configuration
CEP_API_URL=https://tu-dominio.trycloudflare.com
# o
CEP_API_URL=http://localhost:3010

# Email Notifications (opcional)
NOTIFICATION_EMAIL_FROM=noreply@tuempresa.com
NOTIFICATION_EMAIL_TO=admin@tuempresa.com

# Slack Notifications (opcional)
SLACK_CHANNEL=#cep-notifications

# Default Settings
DEFAULT_EMAIL=admin@tuempresa.com
STORAGE_BUCKET=cep-results
```

### 2. Importar el Workflow

1. Abre n8n en tu navegador
2. Ve a **Workflows** → **Import from File**
3. Selecciona el archivo `n8n-workflow-cep-automation.json`
4. Haz clic en **Import**

### 3. Configurar Credenciales

#### Email (si usas notificaciones por email)

1. Ve al nodo **Send Success Email**
2. Haz clic en **Credentials**
3. Selecciona o crea credenciales SMTP:
   - **Host**: smtp.gmail.com (o tu servidor SMTP)
   - **Port**: 587
   - **User**: tu-email@gmail.com
   - **Password**: tu-contraseña-de-aplicación
   - **Secure**: TLS

#### Slack (opcional)

1. Ve al nodo **Slack Success Notification**
2. Configura las credenciales OAuth2 de Slack
3. Autoriza la aplicación en tu workspace

### 4. Activar el Workflow

1. Haz clic en el botón **Active** en la esquina superior derecha
2. El workflow ahora se ejecutará automáticamente según el schedule

## 🚀 Uso del Workflow

### Opción 1: Ejecución Automática (Schedule)

El workflow se ejecuta automáticamente todos los días a las 8:00 AM para obtener los CEPs del día anterior.

**Para cambiar el horario:**

1. Abre el nodo **Schedule Trigger**
2. Modifica la expresión cron (por defecto: `0 8 * * *`)
3. Guarda los cambios

### Opción 2: Ejecución Manual (Webhook)

#### Generar CEPs del día anterior

```bash
curl -X POST https://tu-n8n.com/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "format": "ambos"
  }'
```

#### Generar CEPs con rango de fechas

```bash
curl -X POST https://tu-n8n.com/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "format": "pdf",
    "use_range": true,
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }'
```

### Opción 3: Ejecución desde n8n UI

1. Abre el workflow en n8n
2. Haz clic en **Execute Workflow**
3. El workflow usará los valores por defecto de las variables de entorno

## 📊 Flujo de Trabajo Detallado

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TRIGGERS                                                     │
├─────────────────────────────────────────────────────────────────┤
│ • Schedule Trigger (Cron: 8:00 AM diario)                      │
│ • Webhook Trigger (Manual)                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. VALIDACIÓN                                                   │
├─────────────────────────────────────────────────────────────────┤
│ • Validar email (formato)                                       │
│ • Validar formato (pdf/xml/ambos)                              │
│ • Validar fechas (si use_range = true)                         │
│ • Verificar que start_date < end_date                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │ ¿Válido?      │
                    └───────┬───────┘
                    SÍ ↓         ↓ NO
┌─────────────────────────────────────────────────────────────────┐
│ 3. LLAMADA A API                                                │
├─────────────────────────────────────────────────────────────────┤
│ • Si use_range = false → POST /api/v1/ceps/generate            │
│ • Si use_range = true  → POST /api/v1/ceps/generate-range      │
│ • Reintentos: 3 intentos con 2s de espera                      │
│ • Timeout: 30 segundos                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. PROCESAMIENTO DE RESPUESTA                                   │
├─────────────────────────────────────────────────────────────────┤
│ • Extraer cep_id                                                │
│ • Verificar status = "pending"                                  │
│ • Inicializar contador de polling                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. POLLING LOOP                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ a) Esperar 10 segundos                                  │    │
│ │ b) GET /api/v1/ceps/status/:cepId                       │    │
│ │ c) Analizar estado:                                     │    │
│ │    • completed → Continuar a descarga                   │    │
│ │    • failed → Ir a manejo de errores                    │    │
│ │    • processing/pending → Repetir (max 60 veces)        │    │
│ │ d) Si poll_count >= 60 → Timeout                        │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │ ¿Completado?  │
                    └───────┬───────┘
                    SÍ ↓         ↓ NO (error/timeout)
┌─────────────────────────────────────────────────────────────────┐
│ 6. DESCARGA                                                     │
├─────────────────────────────────────────────────────────────────┤
│ • GET /api/v1/ceps/download/:cepId                              │
│ • Guardar ZIP en disco                                          │
│ • (Opcional) Subir a almacenamiento en nube                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. NOTIFICACIONES                                               │
├─────────────────────────────────────────────────────────────────┤
│ • Email de éxito con detalles                                   │
│ • Slack notification (opcional)                                 │
│ • Respuesta a webhook                                           │
│ • Registro de auditoría                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Monitoreo y Debugging

### Ver Ejecuciones

1. En n8n, ve a **Executions**
2. Filtra por el workflow "CEP Automation - Banxico"
3. Haz clic en una ejecución para ver detalles

### Logs Detallados

Cada nodo de código incluye logging:

- **Validate Parameters**: Errores de validación
- **Process API Response**: Respuesta inicial de la API
- **Analyze Status**: Estado en cada iteración de polling
- **Audit Log**: Registro completo de la ejecución

### Errores Comunes

#### 1. Error de Conexión a la API

**Síntoma**: `ECONNREFUSED` o timeout en nodos HTTP Request

**Solución**:

- Verifica que la variable `CEP_API_URL` esté correcta
- Asegúrate de que la API esté corriendo
- Si usas Cloudflare Tunnel, verifica que esté activo

```bash
# En el servidor
ps aux | grep cloudflared
curl http://localhost:3010/api/v1/health
```

#### 2. Timeout en Polling

**Síntoma**: El workflow termina con "Timeout" después de 10 minutos

**Solución**:

- Revisa los logs de la API: `docker logs -f cep-api-prod`
- Verifica que Playwright esté funcionando correctamente
- Aumenta el `max_polls` en el nodo **Process API Response**

#### 3. Error en Descarga

**Síntoma**: Error 404 en el nodo **Download Result**

**Solución**:

- Verifica que el CEP haya completado exitosamente
- Revisa que `download_available` sea `true` en el status
- Verifica que el archivo exista en Supabase Storage

## 🎛️ Personalización

### Cambiar Frecuencia de Polling

En el nodo **Wait Before Poll**:

```javascript
// Cambiar de 10 segundos a 5 segundos
"amount": 5,
"unit": "seconds"
```

En el nodo **Process API Response**:

```javascript
// Ajustar máximo de intentos (actualmente 60)
max_polls: 120, // 120 intentos × 5s = 10 minutos
```

### Agregar Webhook de Notificación Personalizado

Después del nodo **Prepare Success Notification**, agrega un nodo **HTTP Request**:

```json
{
  "method": "POST",
  "url": "https://tu-webhook-personalizado.com/notify",
  "body": {
    "cep_id": "={{ $json.cep_id }}",
    "status": "success",
    "records": "={{ $json.records_processed }}"
  }
}
```

### Integrar con Base de Datos

Después del nodo **Audit Log**, agrega un nodo **Postgres** o **MySQL**:

```sql
INSERT INTO cep_executions
  (workflow_id, cep_id, status, records_processed, created_at)
VALUES
  ($1, $2, $3, $4, $5)
```

## 📈 Mejores Prácticas

### 1. Manejo de Errores

- **Siempre** configura reintentos en nodos HTTP Request
- **Usa** timeouts apropiados (30s para API calls, 60s para descargas)
- **Implementa** notificaciones de error para monitoreo proactivo

### 2. Performance

- **Ajusta** el intervalo de polling según tus necesidades
- **Considera** usar Redis para estado persistente en lugar de memoria
- **Limpia** archivos temporales después de procesarlos

### 3. Seguridad

- **Nunca** hardcodees credenciales en el workflow
- **Usa** variables de entorno para configuración sensible
- **Implementa** autenticación en el webhook trigger si es público

### 4. Escalabilidad

- **Considera** usar una cola (RabbitMQ, Redis Queue) para múltiples ejecuciones
- **Implementa** rate limiting si tienes muchas ejecuciones concurrentes
- **Monitorea** el uso de recursos de n8n

## 🧪 Testing

### Test Manual desde n8n

1. Desactiva el Schedule Trigger temporalmente
2. Haz clic en **Execute Workflow**
3. Verifica que todos los nodos se ejecuten correctamente
4. Revisa los datos de salida en cada nodo

### Test con Webhook

```bash
# Test básico
curl -X POST http://localhost:5678/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "format": "pdf"
  }'

# Test con rango de fechas
curl -X POST http://localhost:5678/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "format": "ambos",
    "use_range": true,
    "start_date": "2024-01-01",
    "end_date": "2024-01-02"
  }'

# Test de validación (debe fallar)
curl -X POST http://localhost:5678/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-invalido",
    "format": "formato-invalido"
  }'
```

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs** en n8n Executions
2. **Verifica la API** con `curl http://localhost:3010/api/v1/health`
3. **Consulta la documentación** de la API en `README.md`
4. **Revisa los logs de Docker** con `docker logs -f cep-api-prod`

## 🔄 Actualizaciones

Para actualizar el workflow:

1. Exporta la versión actual como backup
2. Importa la nueva versión
3. Verifica que las variables de entorno sigan configuradas
4. Prueba con una ejecución manual antes de activar

## 📝 Notas Adicionales

- El workflow está configurado para **timezone America/Mexico_City**
- Los archivos descargados se guardan con el nombre `{cep_id}_ceps.zip`
- El nodo de subida a almacenamiento está configurado para Google Drive pero puede cambiarse a S3, Azure Blob, etc.
- Las notificaciones de email y Slack son **opcionales** y pueden deshabilitarse

## 🎉 ¡Listo!

Tu workflow de n8n está configurado y listo para automatizar completamente el proceso de generación de CEPs desde Banxico.
