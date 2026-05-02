# LATAM Document Validator API

Valida documentos tributarios e identidad de 6 países latinoamericanos:
CUIT/CUIL (Argentina), RUT (Chile), CPF/CNPJ (Brasil), NIT (Colombia), RFC (México), RUT (Uruguay).

---

## PASOS ANTES DEL CÓDIGO

### 1. Crear cuenta en Anthropic (para obtener API key interna)
No es necesario para esta API — no usa ningún LLM. Costo operativo: $0.

### 2. Instalar Node.js
Descargar desde https://nodejs.org (versión 18 o superior)

```bash
node --version   # debe mostrar v18+
npm --version    # debe mostrar 8+
```

### 3. Crear cuenta gratuita en GitHub
https://github.com — necesitás un repo para deployar en Railway/Render.

### 4. Instalar Git
https://git-scm.com/downloads

---

## SETUP LOCAL

```bash
# Clonar / entrar al directorio
cd latam-validator-api

# Instalar dependencias
npm install

# Correr en modo desarrollo
node index.js
```

La API corre en http://localhost:3000

---

## PROBAR LOCALMENTE

```bash
# Ver documentos soportados
curl http://localhost:3000/v1/supported

# Validar CUIT argentino
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: free-demo-key" \
  -d '{"document": "20-12345678-6", "type": "cuit"}'

# Validar RUT chileno
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: free-demo-key" \
  -d '{"document": "7775735-K", "type": "rut"}'

# Validar CPF brasileño
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: free-demo-key" \
  -d '{"document": "529.982.247-25", "type": "cpf"}'

# Auto-detectar tipo de documento
curl -X POST http://localhost:3000/v1/validate/auto \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: free-demo-key" \
  -d '{"document": "529.982.247-25"}'

# Validar batch (requiere plan basic)
curl -X POST http://localhost:3000/v1/validate/batch \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: basic-demo-key" \
  -d '{
    "documents": [
      {"document": "529.982.247-25", "type": "cpf"},
      {"document": "7775735-K", "type": "rut"},
      {"document": "20-12345678-6", "type": "cuit"}
    ]
  }'
```

### API Keys de demo

| Key              | Plan  | Límite          |
|------------------|-------|-----------------|
| free-demo-key    | Free  | 100 req/mes     |
| basic-demo-key   | Basic | 2.000 req/mes   |
| pro-demo-key     | Pro   | 10.000 req/mes  |

---

## Documentos soportados y formatos

| Tipo    | País       | Formato ejemplo          |
|---------|------------|--------------------------|
| cuit    | Argentina  | 20-12345678-6            |
| cuil    | Argentina  | 27-34567890-4            |
| rut     | Chile      | 7775735-K                |
| cpf     | Brasil     | 529.982.247-25           |
| cnpj    | Brasil     | 11.222.333/0001-81       |
| nit     | Colombia   | 900455955-1              |
| rfc     | México     | XAXX010101000            |
| rut_uy  | Uruguay    | 210000040018             |

---

## PASOS PARA PUBLICAR EN RAPIDAPI

### PASO 1 — Subir el código a GitHub

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/latam-validator-api.git
git push -u origin main
```

### PASO 2 — Deployar gratis en Railway

1. Ir a https://railway.app y crear cuenta con GitHub
2. Click en "New Project" → "Deploy from GitHub repo"
3. Seleccionar tu repo `latam-validator-api`
4. Railway detecta Node.js automáticamente
5. En "Settings" → "Networking" → "Generate Domain" para obtener URL pública
6. No necesitás variables de entorno (esta API no usa LLMs)
7. Copiá la URL que te da Railway, ejemplo: `https://latam-validator-api.up.railway.app`

### PASO 3 — Crear cuenta en RapidAPI como proveedor

1. Ir a https://rapidapi.com/provider
2. Crear cuenta gratuita
3. Click en "Add New API" → "REST API"
4. Completar:
   - **API Name:** LATAM Document Validator
   - **Short Description:** Validate tax IDs and identity documents from Argentina, Chile, Brazil, Colombia, Mexico, and Uruguay
   - **Category:** Data / Business Intelligence
   - **Base URL:** tu URL de Railway

### PASO 4 — Configurar los endpoints en RapidAPI

Para cada endpoint, completar en el panel:

**Endpoint 1:**
- Method: POST
- Path: /v1/validate
- Description: Validate a specific document type
- Headers: X-Api-Key (required)
- Body params: document (string, required), type (string, required)

**Endpoint 2:**
- Method: POST
- Path: /v1/validate/auto
- Description: Auto-detect and validate any LATAM document
- Headers: X-Api-Key (required)
- Body params: document (string, required)

**Endpoint 3:**
- Method: POST
- Path: /v1/validate/batch
- Description: Validate up to 100 documents in one request (Basic+)
- Headers: X-Api-Key (required)
- Body params: documents (array, required)

**Endpoint 4:**
- Method: GET
- Path: /v1/supported
- Description: List all supported document types

### PASO 5 — Configurar los planes de pricing

En RapidAPI → "Pricing" → crear estos planes:

| Plan  | Precio     | Requests/mes | Notas                        |
|-------|------------|--------------|------------------------------|
| Free  | $0         | 100          | Solo /validate y /auto       |
| Basic | $9/mes     | 2.000        | + Batch endpoint             |
| Pro   | $29/mes    | 10.000       | + Soporte prioritario        |
| Ultra | $99/mes    | 50.000       | + SLA commitment             |

RapidAPI descuenta 20% de cada cobro que hagas.

### PASO 6 — Conectar pagos

1. En RapidAPI → Settings → Billing
2. Conectar cuenta de Stripe (o PayPal)
3. Completar datos fiscales (necesitás un método de cobro)

### PASO 7 — Configurar autenticación real

El código actual usa API keys hardcodeadas para demo.
Para producción, reemplazar la función `getPlanFromKey` en index.js
para que consulte una base de datos real.

Opción más simple y gratuita: usar Supabase (PostgreSQL gratis):
- https://supabase.com → crear proyecto gratis
- Tabla: `api_keys (key TEXT, plan TEXT, requests_used INT, created_at TIMESTAMP)`
- Cuando un usuario paga en RapidAPI, su key llega via webhook a tu endpoint

### PASO 8 — Escribir buena documentación en RapidAPI

Lo que más influye en las conversiones:
- Poner ejemplos de request/response para cada país
- Explicar el algoritmo de validación (genera confianza)
- Agregar un "Try it" con valores de ejemplo prellenados
- Responder preguntas en el foro de la API rápido (primeras semanas)

### PASO 9 — Promocionar

Lugares donde publicar para conseguir los primeros usuarios:
- Reddit: r/webdev, r/latinamerican_devs, r/argentina
- Twitter/X con hashtag #devlatam #buildinpublic
- Grupos de WhatsApp/Telegram de devs argentinos/chilenos
- Dev.to — escribir un artículo sobre validación de documentos LATAM
- Hacker News "Show HN" si el inglés no es problema

---

## ESTRUCTURA DEL RESPONSE

```json
{
  "document": "529.982.247-25",
  "type": "cpf",
  "country": "Brasil",
  "full_name": "Cadastro de Pessoas Físicas",
  "valid": true,
  "issuing_region": "DF/GO/MS/MT/RO/TO",
  "formatted": "529.982.247-25",
  "digits": "52998224725",
  "request_id": "req_ab3f7c2d"
}
```

---

## PROYECCIÓN DE INGRESOS

| Escenario   | Free | Basic | Pro | MRR    |
|-------------|------|-------|-----|--------|
| Mes 1-2     | 50   | 5     | 0   | $45    |
| Mes 3-4     | 200  | 20    | 3   | $267   |
| Mes 6+      | 500  | 60    | 15  | $975   |

Costo operativo mensual: $0 (Railway tier gratuito hasta 500h/mes).
