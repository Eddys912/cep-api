# 🤖 Automatización n8n para CEP API

## 📋 Resumen Ejecutivo

Este paquete contiene un **workflow completo de n8n** para automatizar la generación y descarga de Comprobantes Electrónicos de Pago (CEP) desde el portal de Banxico, consumiendo la API desarrollada en este proyecto.

### ✨ Lo que obtienes

- ✅ **Workflow completo** listo para importar en n8n
- ✅ **Documentación detallada** de configuración y uso
- ✅ **Ejemplos prácticos** para casos de uso comunes
- ✅ **Análisis del proyecto** con recomendaciones
- ✅ **Manejo robusto de errores** y reintentos
- ✅ **Notificaciones multi-canal** (Email, Slack, etc.)

---

## 📦 Archivos Incluidos

| Archivo                            | Descripción                                |
| ---------------------------------- | ------------------------------------------ |
| `n8n-workflow-cep-automation.json` | Workflow de n8n listo para importar        |
| `N8N_SETUP_GUIDE.md`               | Guía completa de configuración paso a paso |
| `N8N_USAGE_EXAMPLES.md`            | Ejemplos de uso y casos prácticos          |
| `PROJECT_ANALYSIS.md`              | Análisis del proyecto y recomendaciones    |
| `.env.n8n.example`                 | Variables de entorno de ejemplo            |
| `README_N8N.md`                    | Este archivo                               |

---

## 🚀 Quick Start

### 1. Importar el Workflow

1. Abre n8n en tu navegador
2. Ve a **Workflows** → **Import from File**
3. Selecciona `n8n-workflow-cep-automation.json`
4. Haz clic en **Import**

### 2. Configurar Variables de Entorno

En n8n, ve a **Settings** → **Environment Variables** y agrega:

```bash
CEP_API_URL=https://tu-dominio.trycloudflare.com
DEFAULT_EMAIL=admin@tuempresa.com
NOTIFICATION_EMAIL_FROM=noreply@tuempresa.com
NOTIFICATION_EMAIL_TO=equipo@tuempresa.com
```

### 3. Configurar Credenciales

- **Email**: Configura SMTP en los nodos de email
- **Slack** (opcional): Configura OAuth2 en los nodos de Slack

### 4. Activar el Workflow

Haz clic en el botón **Active** en la esquina superior derecha.

¡Listo! El workflow se ejecutará automáticamente todos los días a las 8:00 AM.

---

## 🎯 Características Principales

### 🔄 Automatización Completa

```
Trigger → Validación → API Call → Polling → Descarga → Notificación
```

- **Doble trigger**: Schedule (automático) y Webhook (manual)
- **Validación robusta**: Email, formato, fechas
- **Polling inteligente**: Consulta automática cada 10s (máx 10 min)
- **Descarga automática**: Guarda ZIP en disco o nube
- **Notificaciones**: Email, Slack, webhook response

### 🛡️ Manejo de Errores

- ✅ Reintentos automáticos (3 intentos)
- ✅ Timeouts configurables
- ✅ Validación en cada etapa
- ✅ Notificaciones de error
- ✅ Logging detallado

### 📊 Monitoreo

- ✅ Dashboard de ejecuciones en n8n
- ✅ Logs detallados por nodo
- ✅ Auditoría completa
- ✅ Métricas de tiempo y registros

---

## 📖 Documentación

### Para Empezar

👉 Lee **[N8N_SETUP_GUIDE.md](./N8N_SETUP_GUIDE.md)** para configuración detallada

### Ejemplos de Uso

👉 Consulta **[N8N_USAGE_EXAMPLES.md](./N8N_USAGE_EXAMPLES.md)** para casos prácticos

### Análisis Técnico

👉 Revisa **[PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)** para entender el proyecto

---

## 🎮 Uso Rápido

### Ejecución Automática (Schedule)

El workflow se ejecuta **automáticamente todos los días a las 8:00 AM** para generar CEPs del día anterior.

### Ejecución Manual (Webhook)

```bash
# Generar CEPs del día anterior
curl -X POST https://tu-n8n.com/webhook/cep-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "format": "ambos"
  }'

# Generar CEPs con rango de fechas
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

---

## 🔧 Configuración Mínima Requerida

### Variables de Entorno Obligatorias

```bash
CEP_API_URL=https://tu-api.com  # URL de la API CEP
```

### Variables de Entorno Opcionales

```bash
DEFAULT_EMAIL=admin@tuempresa.com
DEFAULT_FORMAT=ambos
NOTIFICATION_EMAIL_FROM=noreply@tuempresa.com
NOTIFICATION_EMAIL_TO=equipo@tuempresa.com
SLACK_CHANNEL=#cep-notifications
```

Ver `.env.n8n.example` para configuración completa.

---

## 📊 Flujo del Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ TRIGGERS                                                    │
│ • Schedule (8:00 AM diario)                                │
│ • Webhook (manual)                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ VALIDACIÓN                                                  │
│ • Email, formato, fechas                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ LLAMADA A API                                               │
│ • POST /api/v1/ceps/generate                                │
│ • Obtiene cep_id                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ POLLING LOOP (máx 10 min)                                   │
│ • Espera 10s                                                │
│ • GET /api/v1/ceps/status/:cepId                            │
│ • Repite hasta completed/failed/timeout                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ DESCARGA                                                    │
│ • GET /api/v1/ceps/download/:cepId                          │
│ • Guarda ZIP en disco                                       │
│ • (Opcional) Sube a nube                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ NOTIFICACIONES                                              │
│ • Email con detalles                                        │
│ • Slack (opcional)                                          │
│ • Webhook response                                          │
│ • Auditoría                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Casos de Uso

### 1. Automatización Diaria

Genera CEPs del día anterior automáticamente cada mañana.

### 2. Integración con ERP/CRM

Llama al webhook desde tu sistema existente para generar CEPs bajo demanda.

### 3. Cierre Mensual

Genera CEPs de todo un mes para cierre contable.

### 4. Notificaciones a Equipos

Notifica automáticamente a contabilidad/finanzas cuando los CEPs están listos.

### 5. Almacenamiento Centralizado

Sube automáticamente los CEPs a Google Drive, S3, Dropbox, etc.

---

## 🔍 Troubleshooting Rápido

### El workflow no se ejecuta automáticamente

- ✅ Verifica que el workflow esté **Active**
- ✅ Revisa el Schedule Trigger (debe estar habilitado)

### Error de conexión a la API

- ✅ Verifica que `CEP_API_URL` esté correcta
- ✅ Asegúrate de que la API esté corriendo
- ✅ Si usas Cloudflare Tunnel, verifica que esté activo

### Timeout en polling

- ✅ Revisa logs de la API: `docker logs -f cep-api-prod`
- ✅ Aumenta `MAX_POLL_ATTEMPTS` si es necesario

### Emails no llegan

- ✅ Verifica credenciales SMTP en n8n
- ✅ Para Gmail, usa contraseña de aplicación

---

## 📈 Ventajas vs Consumo Directo

| Aspecto           | Consumo Directo       | Con n8n                 |
| ----------------- | --------------------- | ----------------------- |
| Polling           | Manual                | ✅ Automático           |
| Reintentos        | Código custom         | ✅ Configuración visual |
| Notificaciones    | Implementación manual | ✅ 50+ integraciones    |
| Almacenamiento    | Código personalizado  | ✅ Drag & drop          |
| Debugging         | Logs en código        | ✅ UI visual            |
| Tiempo desarrollo | Días/Semanas          | ✅ Horas                |

---

## 🛠️ Personalización

El workflow es completamente personalizable:

- 🔧 Cambia horarios de ejecución
- 🔧 Agrega más notificaciones (Teams, Discord, etc.)
- 🔧 Integra con tu base de datos
- 🔧 Procesa archivos descargados
- 🔧 Agrega validaciones personalizadas

Ver **[N8N_USAGE_EXAMPLES.md](./N8N_USAGE_EXAMPLES.md)** para ejemplos.

---

## 📞 Soporte

### Documentación Completa

- **Configuración**: [N8N_SETUP_GUIDE.md](./N8N_SETUP_GUIDE.md)
- **Ejemplos**: [N8N_USAGE_EXAMPLES.md](./N8N_USAGE_EXAMPLES.md)
- **Análisis**: [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)

### Recursos Adicionales

- [Documentación de n8n](https://docs.n8n.io/)
- [Documentación de la API](./README.md)
- [Documentación de operaciones](./Doc.md)

---

## 🎉 ¡Listo para Usar!

Este workflow está **listo para producción** y ha sido diseñado siguiendo las mejores prácticas de n8n y automatización.

### Próximos Pasos

1. ✅ Importa el workflow
2. ✅ Configura variables de entorno
3. ✅ Configura credenciales (SMTP, Slack)
4. ✅ Activa el workflow
5. ✅ ¡Disfruta de la automatización!

---

## 📝 Notas Importantes

- ⚠️ El workflow requiere que la **API CEP esté corriendo**
- ⚠️ Las notificaciones por email/Slack son **opcionales**
- ⚠️ El almacenamiento en nube requiere **configuración adicional**
- ⚠️ Prueba en **desarrollo** antes de usar en **producción**

---

## 🏆 Características Destacadas

### ✨ Validación Robusta

Valida email, formato y fechas antes de llamar a la API.

### ✨ Polling Inteligente

Consulta el estado automáticamente sin saturar la API.

### ✨ Manejo de Errores

Reintentos automáticos y notificaciones de error.

### ✨ Multi-Canal

Notificaciones por email, Slack, webhook, etc.

### ✨ Auditoría Completa

Logs detallados de cada ejecución.

### ✨ Extensible

Fácil de personalizar y extender.

---

## 📄 Licencia

Este workflow está incluido como parte del proyecto CEP API.

---

## 👨‍💻 Autor

Desarrollado para automatizar completamente el proceso de generación de CEPs desde Banxico.

---

**¿Preguntas?** Consulta la documentación completa en los archivos incluidos.

**¿Problemas?** Revisa la sección de Troubleshooting en [N8N_SETUP_GUIDE.md](./N8N_SETUP_GUIDE.md).

**¿Necesitas más ejemplos?** Consulta [N8N_USAGE_EXAMPLES.md](./N8N_USAGE_EXAMPLES.md).

---

<div align="center">

**🚀 ¡Automatiza tus CEPs con n8n! 🚀**

</div>
