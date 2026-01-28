# Documentación de Operaciones - CEP API & Túnel

Este documento contiene los comandos necesarios para gestionar la API en Docker y el Túnel de Cloudflare en el servidor (Ubuntu 16).

**Ruta del proyecto:** `/home/user/cep-api`  
**Puerto interno (Docker):** `3000`  
**Puerto expuesto (Host):** `3010`

## 1. Gestión del Túnel Cloudflare (Acceso Público)

El túnel se ejecuta en segundo plano usando `nohup`. Esto permite que siga activo aunque cierres la terminal (Putty).

### ➤ Iniciar el Túnel

Ejecuta esto para abrir la conexión al mundo (genera una URL nueva cada vez):

```bash
nohup ./cloudflared tunnel --url http://localhost:3010 > tunnel.log 2>&1 &
```

### ➤ Obtener la URL Pública

Para saber qué dirección web te asignó Cloudflare para poner en Apidog:

```bash
grep -o 'https://[-a-z0-9.]*trycloudflare.com' tunnel.log
```

_(Si no sale nada, espera 10 segundos y vuelve a ejecutarlo)._

### ➤ Ver logs del Túnel

Para ver si hay errores de conexión o tráfico en tiempo real:

```bash
tail -f tunnel.log
```

_(Presiona `Ctrl + C` para salir de la vista de logs)._

### ➤ Detener el Túnel

Como está en segundo plano, debes buscar su ID y matarlo:

1. **Buscar el proceso:**
   ```bash
   ps aux | grep cloudflared
   ```
2. **Eliminarlo:** (Sustituye `PID` por el número que aparece en la segunda columna):
   ```bash
   kill -9 PID
   ```

## 2. Gestión de la API (Docker)

La aplicación corre dentro de un contenedor llamado `cep-api-prod`.

### ➤ Ver logs de la API (Banxico / Playwright)

Para ver qué está haciendo el navegador o si hubo errores al generar el CEP:

```bash
docker logs -f cep-api-prod
```

_(Presiona `Ctrl + C` para salir)._

### ➤ Verificar si el contenedor está corriendo

```bash
docker ps
```

Debe aparecer en la lista con status "Up".

### ➤ Reiniciar la API

Si notas que se trabó o quieres refrescarla:

```bash
docker restart cep-api-prod
```

### ➤ Detener y Borrar el contenedor

Si necesitas apagarla completamente:

```bash
docker stop cep-api-prod
docker rm cep-api-prod
```

## 3. Actualización del Código (Despliegue)

Si hiciste cambios en el código (`git pull`) y necesitas aplicarlos:

1. **Detener la versión anterior:**
   ```bash
   docker stop cep-api-prod
   docker rm cep-api-prod
   ```
2. **Reconstruir la imagen:**
   ```bash
   docker build -t cep-api:latest .
   ```
3. **Lanzar el contenedor nuevo:**
   ```bash
   docker run -d \
     --name cep-api-prod \
     -p 3010:3000 \
     --env-file .env \
     --restart always \
     --security-opt seccomp=unconfined \
     cep-api:latest
   ```

## 4. Diagnóstico Rápido

Si la API no responde en Apidog:

1. **Revisar si el túnel sigue vivo:**

   ```bash
   ps aux | grep cloudflared
   ```

   Si no aparece, vuelve a iniciarlo con el comando de la sección 1.

2. **Probar la API localmente (dentro del servidor):**

   ```bash
   curl -i http://localhost:3010/api/v1/health
   ```

   - Si esto falla, el problema es **Docker** (Sección 2).
   - Si esto funciona, el problema es el **Túnel**.

3. **Verificar puertos ocupados:**
   ```bash
   netstat -tulpn | grep 3010
   ```
