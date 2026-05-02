require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { validateCUIT, validateRUT, validateCPF, validateCNPJ, validateNIT, validateRFC, validateRUTUruguay, autoDetect } = require('./validators');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Planes y autenticación ───────────────────────────────────────────────────
const PLANS = {
  'free-demo-key':  { name: 'free',  limit: 100 },
  'basic-demo-key': { name: 'basic', limit: 2000 },
  'pro-demo-key':   { name: 'pro',   limit: 10000 },
};

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-Api-Key header' });
  const plan = PLANS[key];
  if (!plan) return res.status(401).json({ error: 'Invalid API key' });
  req.plan = plan;
  next();
}

// Rate limit global (por IP como fallback)
app.use(rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VALIDATORS = {
  cuit: validateCUIT,
  cuil: validateCUIT,
  rut:  validateRUT,
  cpf:  validateCPF,
  cnpj: validateCNPJ,
  nit:  validateNIT,
  rfc:  validateRFC,
  rut_uy: validateRUTUruguay,
};

const DOC_INFO = {
  cuit:   { country: 'Argentina', full_name: 'Clave Única de Identificación Tributaria' },
  cuil:   { country: 'Argentina', full_name: 'Código Único de Identificación Laboral' },
  rut:    { country: 'Chile',     full_name: 'Rol Único Tributario' },
  cpf:    { country: 'Brasil',    full_name: 'Cadastro de Pessoas Físicas' },
  cnpj:   { country: 'Brasil',    full_name: 'Cadastro Nacional da Pessoa Jurídica' },
  nit:    { country: 'Colombia',  full_name: 'Número de Identificación Tributaria' },
  rfc:    { country: 'México',    full_name: 'Registro Federal de Contribuyentes' },
  rut_uy: { country: 'Uruguay',   full_name: 'Registro Único Tributario' },
};

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    api: 'LATAM Document Validator API',
    version: '1.0.0',
    description: 'Validate tax and identity documents from 6 Latin American countries',
    supported_documents: Object.keys(DOC_INFO),
    endpoints: {
      'POST /v1/validate':          'Validate a specific document type',
      'POST /v1/validate/auto':     'Auto-detect document type and validate',
      'POST /v1/validate/batch':    'Validate multiple documents at once (basic+ plan)',
      'GET  /v1/docs/:type':        'Get info and format rules for a document type',
      'GET  /v1/supported':         'List all supported document types',
    },
  });
});

// Documentos soportados
app.get('/v1/supported', (req, res) => {
  const docs = Object.entries(DOC_INFO).map(([type, info]) => ({
    type,
    country: info.country,
    full_name: info.full_name,
    example: getExample(type),
  }));
  res.json({ count: docs.length, documents: docs });
});

// Info de un tipo de documento
app.get('/v1/docs/:type', (req, res) => {
  const type = req.params.type.toLowerCase();
  const info = DOC_INFO[type];
  if (!info) return res.status(404).json({ error: `Unknown document type: ${type}`, supported: Object.keys(DOC_INFO) });

  res.json({
    type,
    ...info,
    format_rules: getFormatRules(type),
    example_valid: getExample(type),
    example_invalid: getInvalidExample(type),
  });
});

// Validar documento específico
app.post('/v1/validate', auth, (req, res) => {
  const { document, type } = req.body;

  if (!document) return res.status(400).json({ error: 'document is required' });
  if (!type)     return res.status(400).json({ error: 'type is required. Call GET /v1/supported to see options' });

  const docType = type.toLowerCase();
  const validator = VALIDATORS[docType];
  if (!validator) {
    return res.status(400).json({ error: `Unknown type: ${docType}`, supported: Object.keys(VALIDATORS) });
  }

  const result = validator(document);
  res.json({
    document,
    type: docType,
    ...DOC_INFO[docType],
    ...result,
    request_id: generateId(),
  });
});

// Auto-detect y validar
app.post('/v1/validate/auto', auth, (req, res) => {
  const { document } = req.body;
  if (!document) return res.status(400).json({ error: 'document is required' });

  const detection = autoDetect(document);

  if (!detection.detected) {
    return res.status(422).json({
      valid: false,
      error: 'Could not auto-detect document type',
      suggestion: 'Use POST /v1/validate and specify the type explicitly',
      document,
    });
  }

  const validator = VALIDATORS[detection.detected];
  const result = validator(document);

  res.json({
    document,
    detected_type: detection.detected,
    detected_country: detection.country,
    ...DOC_INFO[detection.detected],
    ...result,
    request_id: generateId(),
  });
});

// Batch — solo plan basic+
app.post('/v1/validate/batch', auth, (req, res) => {
  if (req.plan.name === 'free') {
    return res.status(403).json({
      error: 'Batch validation requires Basic plan or higher',
      upgrade: 'https://rapidapi.com/your-api',
    });
  }

  const { documents } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'documents must be a non-empty array' });
  }
  if (documents.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 documents per batch request' });
  }

  const results = documents.map(item => {
    if (!item.document || !item.type) {
      return { error: 'Each item needs document and type fields', item };
    }
    const validator = VALIDATORS[item.type.toLowerCase()];
    if (!validator) return { error: `Unknown type: ${item.type}`, item };

    return {
      document: item.document,
      type: item.type.toLowerCase(),
      ...validator(item.document),
    };
  });

  const valid   = results.filter(r => r.valid).length;
  const invalid = results.filter(r => !r.valid).length;

  res.json({
    summary: { total: results.length, valid, invalid },
    results,
    request_id: generateId(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', docs: '/' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return 'req_' + Math.random().toString(36).slice(2, 10);
}

function getExample(type) {
  const examples = {
    cuit: '20-34567890-1', cuil: '27-34567890-4',
    rut: '12345678-9', cpf: '529.982.247-25',
    cnpj: '11.222.333/0001-81', nit: '900455955-1',
    rfc: 'XAXX010101000', rut_uy: '210000040018',
  };
  return examples[type] || '';
}

function getInvalidExample(type) {
  const examples = {
    cuit: '20-00000000-0', cuil: '27-00000000-0',
    rut: '12345678-0', cpf: '111.111.111-11',
    cnpj: '11.111.111/1111-11', nit: '900000000-0',
    rfc: 'ABC123456', rut_uy: '000000000000',
  };
  return examples[type] || '';
}

function getFormatRules(type) {
  const rules = {
    cuit:   'XX-XXXXXXXX-X (11 digits, prefix 20/23/24/25/26/27/30/33/34)',
    cuil:   'XX-XXXXXXXX-X (11 digits, same format as CUIT)',
    rut:    'XXXXXXXX-X (7-8 digits + dash + digit or K)',
    cpf:    'XXX.XXX.XXX-XX (11 digits)',
    cnpj:   'XX.XXX.XXX/XXXX-XX (14 digits)',
    nit:    'XXXXXXXXX-X (9-10 digits)',
    rfc:    'AAAA######XXX (13 chars individual) or AAA######XXX (12 chars company)',
    rut_uy: 'XXXXXXXXXXXX (12 digits)',
  };
  return rules[type] || '';
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LATAM Document Validator API running on port ${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/v1/supported`);
});
