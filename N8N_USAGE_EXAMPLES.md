# Ejemplos de Uso - n8n Workflow para CEP API

## 📚 Tabla de Contenidos

1. [Casos de Uso Comunes](#casos-de-uso-comunes)
2. [Ejemplos de Configuración](#ejemplos-de-configuración)
3. [Escenarios Avanzados](#escenarios-avanzados)
4. [Troubleshooting](#troubleshooting)

---

## 🎯 Casos de Uso Comunes

### 1. Generación Diaria Automática

**Escenario**: Necesitas generar CEPs del día anterior automáticamente todos los días a las 8:00 AM.

**Configuración**:

- Usa el **Schedule Trigger** con cron: `0 8 * * *`
- El workflow se ejecutará automáticamente
- Recibirás notificaciones por email/Slack

**Variables de entorno**:

```bash
CEP_API_URL=https://tu-api.com
DEFAULT_EMAIL=finanzas@tuempresa.com
DEFAULT_FORMAT=ambos
NOTIFICATION_EMAIL_TO=equipo-contabilidad@tuempresa.com
```

**Resultado esperado**:

- Ejecución diaria a las 8:00 AM
- CEPs del día anterior descargados automáticamente
- Email enviado al equipo de contabilidad con el link de descarga

---

### 2. Generación Manual por Webhook

**Escenario**: Necesitas generar CEPs bajo demanda desde otro sistema (ERP, CRM, etc.).

**Ejemplo de llamada desde tu sistema**:

```javascript
// Desde tu aplicación Node.js
const axios = require("axios");

async function generarCEPs() {
  try {
    const response = await axios.post("https://tu-n8n.com/webhook/cep-webhook", {
      email: "usuario@ejemplo.com",
      format: "pdf",
    });

    console.log("CEP iniciado:", response.data);
    // { status: 'success', cep_id: '...', ... }
  } catch (error) {
    console.error("Error:", error.response.data);
  }
}
```

```python
# Desde tu aplicación Python
import requests

def generar_ceps():
    url = 'https://tu-n8n.com/webhook/cep-webhook'
    payload = {
        'email': 'usuario@ejemplo.com',
        'format': 'ambos'
    }

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        print('CEP iniciado:', response.json())
    else:
        print('Error:', response.json())
```

```bash
# Desde la terminal o script bash
curl -X POST https://tu-n8n.com/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "format": "xml"
  }'
```

---

### 3. Generación con Rango de Fechas

**Escenario**: Necesitas generar CEPs de todo un mes para cierre contable.

**Ejemplo**:

```bash
# Generar CEPs de enero 2024
curl -X POST https://tu-n8n.com/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cierre-mensual@empresa.com",
    "format": "ambos",
    "use_range": true,
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }'
```

**Desde Excel/VBA**:

```vb
Sub GenerarCEPsMensual()
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")

    Dim url As String
    url = "https://tu-n8n.com/webhook/cep-webhook"

    Dim json As String
    json = "{" & _
           """email"": ""contabilidad@empresa.com""," & _
           """format"": ""ambos""," & _
           """use_range"": true," & _
           """start_date"": ""2024-01-01""," & _
           """end_date"": ""2024-01-31""" & _
           "}"

    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send json

    MsgBox "Respuesta: " & http.responseText
End Sub
```

---

### 4. Integración con Google Sheets

**Escenario**: Tienes una hoja de Google Sheets donde registras las fechas para generar CEPs.

**Configuración en n8n**:

1. Agrega un nodo **Google Sheets Trigger**
2. Configúralo para detectar nuevas filas
3. Conecta con el nodo **Validate Parameters**

**Estructura de la hoja**:

| Fecha Inicio | Fecha Fin  | Email            | Formato | Estado    |
| ------------ | ---------- | ---------------- | ------- | --------- |
| 2024-01-01   | 2024-01-31 | user@example.com | ambos   | Pendiente |

**El workflow**:

- Detecta nueva fila
- Genera CEPs con esas fechas
- Actualiza columna "Estado" a "Completado"
- Agrega link de descarga en nueva columna

---

### 5. Notificación a Microsoft Teams

**Escenario**: Tu equipo usa Teams y quieres notificaciones ahí.

**Modificación del workflow**:

1. Después del nodo **Prepare Success Notification**
2. Agrega nodo **Microsoft Teams**
3. Configura el mensaje:

```json
{
  "title": "✅ CEP Generado Exitosamente",
  "text": "Se ha generado un nuevo lote de CEPs",
  "sections": [
    {
      "activityTitle": "Detalles",
      "facts": [
        {
          "name": "CEP ID",
          "value": "{{ $json.cep_id }}"
        },
        {
          "name": "Registros procesados",
          "value": "{{ $json.records_processed }}"
        },
        {
          "name": "Tiempo transcurrido",
          "value": "{{ $json.elapsed_time }}"
        }
      ]
    }
  ],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "Descargar CEPs",
      "targets": [
        {
          "os": "default",
          "uri": "{{ $json.download_url }}"
        }
      ]
    }
  ]
}
```

---

### 6. Almacenamiento en AWS S3

**Escenario**: Quieres almacenar los archivos ZIP en S3 en lugar de Supabase.

**Modificación del workflow**:

1. Reemplaza el nodo **Upload to Storage** con **AWS S3**
2. Configura credenciales AWS
3. Configura el bucket y path:

```
Bucket: cep-results
Key: ceps/{{ $now.format('YYYY/MM/DD') }}/{{ $json.cep_id }}.zip
```

**Variables de entorno adicionales**:

```bash
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=cep-results
```

---

### 7. Procesamiento Post-Descarga

**Escenario**: Después de descargar el ZIP, necesitas extraerlo y procesar los PDFs/XMLs.

**Extensión del workflow**:

Después del nodo **Save to Disk**, agrega:

```javascript
// Nodo Code: Extract ZIP
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

const items = $input.all();
const outputItems = [];

for (const item of items) {
  const zipPath = item.binary.data.fileName;
  const extractPath = path.join("/tmp", item.json.cep_id);

  // Crear directorio de extracción
  fs.mkdirSync(extractPath, { recursive: true });

  // Extraer ZIP
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);

  // Listar archivos extraídos
  const files = fs.readdirSync(extractPath);

  outputItems.push({
    json: {
      cep_id: item.json.cep_id,
      extract_path: extractPath,
      files: files,
      pdf_files: files.filter((f) => f.endsWith(".pdf")),
      xml_files: files.filter((f) => f.endsWith(".xml")),
    },
  });
}

return outputItems;
```

Luego puedes procesar cada archivo individualmente.

---

### 8. Validación de Datos Antes de Generar

**Escenario**: Antes de generar CEPs, quieres verificar que hay datos en Supabase para esas fechas.

**Modificación del workflow**:

Después del nodo **Validate Parameters**, agrega:

```javascript
// Nodo Code: Check Data Availability
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const items = $input.all();
const outputItems = [];

for (const item of items) {
  const startDate = item.json.start_date || getYesterdayDate();
  const endDate = item.json.end_date || getYesterdayDate();

  // Consultar si hay datos
  const { data, error } = await supabase
    .from("pagos_stp_raw")
    .select("count")
    .gte("fecha_pago", startDate)
    .lte("fecha_pago", endDate);

  if (error || !data || data.length === 0) {
    outputItems.push({
      json: {
        ...item.json,
        has_data: false,
        error: "No hay datos para las fechas especificadas",
      },
    });
  } else {
    outputItems.push({
      json: {
        ...item.json,
        has_data: true,
        estimated_records: data[0].count,
      },
    });
  }
}

return outputItems;

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}
```

---

### 9. Retry con Backoff Exponencial

**Escenario**: Si falla la generación, quieres reintentar con backoff exponencial.

**Modificación del workflow**:

Después del nodo **Prepare Error Notification**, agrega:

```javascript
// Nodo Code: Retry Logic
const items = $input.all();
const outputItems = [];

for (const item of items) {
  const retryCount = item.json.retry_count || 0;
  const maxRetries = 3;

  if (retryCount < maxRetries) {
    // Calcular tiempo de espera (exponencial)
    const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

    outputItems.push({
      json: {
        ...item.json,
        should_retry: true,
        retry_count: retryCount + 1,
        wait_time_ms: waitTime,
      },
    });
  } else {
    outputItems.push({
      json: {
        ...item.json,
        should_retry: false,
        final_error: "Máximo de reintentos alcanzado",
      },
    });
  }
}

return outputItems;
```

Luego conecta con un nodo **Wait** dinámico y vuelve a intentar.

---

### 10. Dashboard de Métricas

**Escenario**: Quieres enviar métricas a un dashboard (Grafana, Datadog, etc.).

**Extensión del workflow**:

Después del nodo **Audit Log**, agrega:

```javascript
// Nodo HTTP Request: Send Metrics
// Método: POST
// URL: https://api.datadoghq.com/api/v1/series

{
  "series": [
    {
      "metric": "cep.generation.duration",
      "points": [[
        "={{ $now.toUnix() }}",
        "={{ $json.elapsed_time_seconds }}"
      ]],
      "type": "gauge",
      "tags": [
        "status:{{ $json.status }}",
        "cep_id:{{ $json.cep_id }}"
      ]
    },
    {
      "metric": "cep.records.processed",
      "points": [[
        "={{ $now.toUnix() }}",
        "={{ $json.records_processed }}"
      ]],
      "type": "count"
    }
  ]
}
```

---

## 🔧 Ejemplos de Configuración

### Configuración para Desarrollo

```bash
# .env.n8n.development
CEP_API_URL=http://localhost:3010
DEFAULT_EMAIL=dev@localhost
DEFAULT_FORMAT=pdf
NOTIFICATION_EMAIL_TO=dev@localhost
LOG_LEVEL=debug
ENABLE_AUDIT_LOG=true
```

### Configuración para Producción

```bash
# .env.n8n.production
CEP_API_URL=https://cep-api.tuempresa.com
DEFAULT_EMAIL=produccion@tuempresa.com
DEFAULT_FORMAT=ambos
NOTIFICATION_EMAIL_TO=finanzas@tuempresa.com,contabilidad@tuempresa.com
SLACK_CHANNEL=#cep-produccion
LOG_LEVEL=info
ENABLE_AUDIT_LOG=true
AWS_S3_BUCKET=cep-results-prod
MAX_POLL_ATTEMPTS=120
POLL_INTERVAL_SECONDS=5
```

---

## 🚀 Escenarios Avanzados

### Escenario 1: Generación Paralela para Múltiples Empresas

**Problema**: Tienes múltiples empresas y necesitas generar CEPs para cada una.

**Solución**:

```javascript
// Nodo Code: Split by Company
const companies = [
  { email: "empresa1@example.com", format: "pdf" },
  { email: "empresa2@example.com", format: "xml" },
  { email: "empresa3@example.com", format: "ambos" },
];

return companies.map((company) => ({
  json: {
    ...company,
    use_range: false,
  },
}));
```

Luego el workflow procesará cada empresa en paralelo.

---

### Escenario 2: Validación de Archivos Descargados

**Problema**: Quieres verificar que el ZIP descargado no esté corrupto.

**Solución**:

```javascript
// Nodo Code: Validate ZIP
const AdmZip = require("adm-zip");
const fs = require("fs");

const items = $input.all();
const outputItems = [];

for (const item of items) {
  const zipPath = item.binary.data.fileName;
  let isValid = false;
  let error = null;

  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Verificar que tenga archivos
    if (entries.length === 0) {
      throw new Error("ZIP vacío");
    }

    // Verificar integridad
    zip.test();

    isValid = true;
  } catch (err) {
    error = err.message;
  }

  outputItems.push({
    json: {
      ...item.json,
      zip_valid: isValid,
      validation_error: error,
      file_count: isValid ? entries.length : 0,
    },
  });
}

return outputItems;
```

---

### Escenario 3: Envío de Archivos por Email

**Problema**: Quieres enviar los CEPs directamente por email en lugar de link de descarga.

**Solución**:

Modifica el nodo **Send Success Email**:

```json
{
  "operation": "sendEmail",
  "fromEmail": "noreply@tuempresa.com",
  "toEmail": "{{ $json.email }}",
  "subject": "CEPs Generados - {{ $json.cep_id }}",
  "emailFormat": "html",
  "message": "<h2>CEPs Generados</h2><p>Adjunto encontrarás los CEPs solicitados.</p>",
  "attachments": "={{ $binary.data }}",
  "options": {}
}
```

---

### Escenario 4: Integración con Sistema de Tickets

**Problema**: Cada generación de CEP debe crear un ticket en tu sistema (Jira, ServiceNow, etc.).

**Solución**:

Después de **Process API Response**, agrega:

```javascript
// Nodo HTTP Request: Create Ticket
// Método: POST
// URL: https://tu-jira.com/rest/api/2/issue

{
  "fields": {
    "project": {
      "key": "FIN"
    },
    "summary": "Generación de CEP - {{ $json.cep_id }}",
    "description": "Se ha iniciado la generación de CEPs.\n\nCEP ID: {{ $json.cep_id }}\nEmail: {{ $json.email }}\nFormato: {{ $json.format }}",
    "issuetype": {
      "name": "Task"
    }
  }
}
```

Luego actualiza el ticket cuando complete:

```javascript
// Después de Download Result
// Método: PUT
// URL: https://tu-jira.com/rest/api/2/issue/{{ $json.ticket_id }}

{
  "fields": {
    "status": {
      "name": "Done"
    }
  },
  "update": {
    "comment": [
      {
        "add": {
          "body": "CEP generado exitosamente. {{ $json.records_processed }} registros procesados.\n\nDescargar: {{ $json.download_url }}"
        }
      }
    ]
  }
}
```

---

## 🔍 Troubleshooting

### Problema 1: Workflow se queda en "Wait Before Poll"

**Síntoma**: El workflow no avanza después del primer wait.

**Causa**: n8n en modo self-hosted sin configuración de webhooks.

**Solución**:

```bash
# En tu .env de n8n
WEBHOOK_URL=https://tu-n8n.com/
N8N_EDITOR_BASE_URL=https://tu-n8n.com/
```

---

### Problema 2: Error "ECONNREFUSED" al llamar a la API

**Síntoma**: Nodos HTTP Request fallan con error de conexión.

**Diagnóstico**:

```bash
# Verificar que la API esté corriendo
curl http://localhost:3010/api/v1/health

# Si usas Docker, verificar red
docker network inspect bridge
```

**Solución**:

- Si n8n y la API están en Docker, usa el nombre del contenedor en lugar de localhost
- Si usas Cloudflare Tunnel, verifica que esté activo
- Actualiza `CEP_API_URL` en variables de entorno

---

### Problema 3: Timeout en Polling

**Síntoma**: El workflow termina con timeout después de 10 minutos.

**Diagnóstico**:

```bash
# Revisar logs de la API
docker logs -f cep-api-prod

# Verificar estado del CEP manualmente
curl http://localhost:3010/api/v1/ceps/status/CEP_ID
```

**Solución**:

- Aumentar `MAX_POLL_ATTEMPTS` en variables de entorno
- Reducir `POLL_INTERVAL_SECONDS` para polling más frecuente
- Revisar si Playwright está teniendo problemas (ver logs de Docker)

---

### Problema 4: Emails no se envían

**Síntoma**: El workflow completa pero no llegan emails.

**Diagnóstico**:

- Verificar credenciales SMTP en n8n
- Revisar logs del nodo **Send Success Email**

**Solución**:

```bash
# Probar SMTP manualmente
telnet smtp.gmail.com 587

# Verificar que las credenciales sean correctas
# Para Gmail, usar contraseña de aplicación, no contraseña normal
```

---

### Problema 5: Archivos no se guardan en disco

**Síntoma**: El nodo **Save to Disk** falla.

**Causa**: Permisos insuficientes o directorio no existe.

**Solución**:

```bash
# En el servidor donde corre n8n
mkdir -p /data/n8n/cep-results
chmod 777 /data/n8n/cep-results

# Actualizar nodo Save to Disk
# Path: /data/n8n/cep-results/{{ $json.cep_id }}.zip
```

---

## 📊 Métricas de Éxito

Para medir el éxito de tu implementación, monitorea:

1. **Tasa de éxito**: % de ejecuciones completadas vs fallidas
2. **Tiempo promedio**: Tiempo desde inicio hasta descarga
3. **Registros procesados**: Total de CEPs generados
4. **Errores comunes**: Tipos de errores más frecuentes
5. **Uso de recursos**: CPU/memoria de n8n durante ejecuciones

---

## 🎓 Conclusión

Este documento cubre los casos de uso más comunes y escenarios avanzados para el workflow de n8n. Puedes combinar y adaptar estos ejemplos según tus necesidades específicas.

**Recuerda**:

- Siempre prueba en desarrollo antes de producción
- Monitorea las ejecuciones regularmente
- Mantén las credenciales seguras
- Documenta tus personalizaciones

¡Buena suerte con tu automatización de CEPs! 🚀
