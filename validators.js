// ─── ARGENTINA — CUIT / CUIL / CDI ───────────────────────────────────────────
function validateCUIT(raw) {
  const cuit = raw.replace(/[-.\s]/g, '');
  if (!/^\d{11}$/.test(cuit)) {
    return { valid: false, error: 'CUIT must be 11 digits' };
  }

  const prefixes = ['20','23','24','25','26','27','30','33','34'];
  const prefix = cuit.slice(0, 2);
  if (!prefixes.includes(prefix)) {
    return { valid: false, error: `Invalid CUIT prefix: ${prefix}` };
  }

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cuit[i]) * weights[i];

  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

  if (parseInt(cuit[10]) !== checkDigit) {
    return { valid: false, error: 'Invalid check digit' };
  }

  const typeMap = { '20': 'Masculino', '23': 'Extranjero', '24': 'Extranjero',
    '25': 'Extranjero', '26': 'Extranjero', '27': 'Femenino',
    '30': 'Empresa', '33': 'Empresa', '34': 'Empresa' };

  return {
    valid: true,
    country: 'Argentina',
    document_type: 'CUIT/CUIL',
    prefix,
    holder_type: typeMap[prefix] || 'Desconocido',
    formatted: `${cuit.slice(0,2)}-${cuit.slice(2,10)}-${cuit[10]}`,
    digits: cuit,
  };
}

// ─── CHILE — RUT ──────────────────────────────────────────────────────────────
function validateRUT(raw) {
  const rut = raw.replace(/[.\s]/g, '').toUpperCase();
  if (!/^\d{7,8}-[\dK]$/.test(rut)) {
    return { valid: false, error: 'RUT format must be XXXXXXXX-X (with dash)' };
  }

  const [body, dv] = rut.split('-');
  const digits = body.split('').reverse();
  const series = [2, 3, 4, 5, 6, 7, 2, 3];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += parseInt(digits[i]) * series[i];

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);

  if (dv !== expected) {
    return { valid: false, error: `Invalid check digit. Expected ${expected}, got ${dv}` };
  }

  const num = parseInt(body);
  let category = 'Persona Natural';
  if (num >= 50000000) category = 'Empresa / Persona Jurídica';
  else if (num >= 46000000) category = 'Extranjero';

  return {
    valid: true,
    country: 'Chile',
    document_type: 'RUT',
    body,
    check_digit: dv,
    category,
    formatted: `${parseInt(body).toLocaleString('es-CL')}-${dv}`,
  };
}

// ─── BRASIL — CPF ─────────────────────────────────────────────────────────────
function validateCPF(raw) {
  const cpf = raw.replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(cpf)) {
    return { valid: false, error: 'CPF must be 11 digits' };
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return { valid: false, error: 'CPF cannot have all identical digits' };
  }

  const calcDigit = (digits, factor) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += parseInt(digits[i]) * (factor - i);
    const rem = (sum * 10) % 11;
    return rem === 10 || rem === 11 ? 0 : rem;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);

  if (parseInt(cpf[9]) !== d1 || parseInt(cpf[10]) !== d2) {
    return { valid: false, error: 'Invalid check digits' };
  }

  // Region by 8th digit
  const regions = ['SP','MG','RJ','RS','BA/SE','ES/RJ','MG','DF/GO/MS/MT/RO/TO','AM/AP/PA/RR','PR/SC','RS'];
  const region = regions[parseInt(cpf[8])] || 'Unknown';

  return {
    valid: true,
    country: 'Brasil',
    document_type: 'CPF',
    issuing_region: region,
    formatted: `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`,
    digits: cpf,
  };
}

// ─── BRASIL — CNPJ ────────────────────────────────────────────────────────────
function validateCNPJ(raw) {
  const cnpj = raw.replace(/[.\-\/\s]/g, '');
  if (!/^\d{14}$/.test(cnpj)) {
    return { valid: false, error: 'CNPJ must be 14 digits' };
  }

  if (/^(\d)\1{13}$/.test(cnpj)) {
    return { valid: false, error: 'CNPJ cannot have all identical digits' };
  }

  const calcDigit = (digits, weights) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(digits[i]) * weights[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  const d1 = calcDigit(cnpj, w1);
  const d2 = calcDigit(cnpj, w2);

  if (parseInt(cnpj[12]) !== d1 || parseInt(cnpj[13]) !== d2) {
    return { valid: false, error: 'Invalid check digits' };
  }

  return {
    valid: true,
    country: 'Brasil',
    document_type: 'CNPJ',
    branch: cnpj.slice(8, 12),
    is_headquarters: cnpj.slice(8, 12) === '0001',
    formatted: `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12)}`,
    digits: cnpj,
  };
}

// ─── COLOMBIA — NIT ───────────────────────────────────────────────────────────
function validateNIT(raw) {
  const nit = raw.replace(/[.\-\s]/g, '');
  if (!/^\d{9,10}$/.test(nit)) {
    return { valid: false, error: 'NIT must be 9 or 10 digits' };
  }

  const body = nit.slice(0, -1);
  const dv = parseInt(nit.slice(-1));
  const weights = [3,7,13,17,19,23,29,37,41,43,47,53,59,67,71];
  const digits = body.split('').reverse();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += parseInt(digits[i]) * weights[i];

  const rem = sum % 11;
  const expected = rem > 1 ? 11 - rem : rem;

  if (dv !== expected) {
    return { valid: false, error: `Invalid check digit. Expected ${expected}` };
  }

  return {
    valid: true,
    country: 'Colombia',
    document_type: 'NIT',
    body,
    check_digit: dv,
    formatted: `${body}-${dv}`,
    digits: nit,
  };
}

// ─── MÉXICO — RFC ─────────────────────────────────────────────────────────────
function validateRFC(raw) {
  const rfc = raw.trim().toUpperCase();

  // Persona física: 13 chars. Persona moral: 12 chars
  const pfRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  const pmRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

  if (!pfRegex.test(rfc) && !pmRegex.test(rfc)) {
    return { valid: false, error: 'Invalid RFC format. Must be 12 chars (company) or 13 chars (individual)' };
  }

  const isPersonaFisica = rfc.length === 13;
  const dateStr = rfc.slice(isPersonaFisica ? 4 : 3, isPersonaFisica ? 10 : 9);
  const year  = parseInt('19' + dateStr.slice(0,2));
  const month = parseInt(dateStr.slice(2,4));
  const day   = parseInt(dateStr.slice(4,6));

  const dateValid = month >= 1 && month <= 12 && day >= 1 && day <= 31;

  // Detect generic RFCs (blacklisted homonim codes)
  const blacklist = ['XAXX010101000','XEXX010101000'];
  const isGeneric = blacklist.includes(rfc);

  return {
    valid: true,
    country: 'México',
    document_type: 'RFC',
    entity_type: isPersonaFisica ? 'Persona Física' : 'Persona Moral',
    birth_or_constitution_date: dateValid ? `${day.toString().padStart(2,'0')}/${month.toString().padStart(2,'0')}/${year}` : 'Invalid date',
    homoclave: rfc.slice(-3),
    is_generic: isGeneric,
    formatted: rfc,
  };
}

// ─── URUGUAY — RUT ────────────────────────────────────────────────────────────
function validateRUTUruguay(raw) {
  const rut = raw.replace(/[-.\s]/g, '');
  if (!/^\d{12}$/.test(rut)) {
    return { valid: false, error: 'RUT Uruguay must be 12 digits' };
  }

  const weights = [4,3,2,9,8,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += parseInt(rut[i]) * weights[i];
  const expected = 11 - (sum % 11);
  const checkDigit = expected >= 10 ? 0 : expected;

  if (parseInt(rut[11]) !== checkDigit) {
    return { valid: false, error: 'Invalid check digit' };
  }

  return {
    valid: true,
    country: 'Uruguay',
    document_type: 'RUT',
    formatted: `${rut.slice(0,2)}-${rut.slice(2,9)}-${rut.slice(9)}`,
    digits: rut,
  };
}

// ─── Auto-detect ──────────────────────────────────────────────────────────────
function autoDetect(raw) {
  const clean = raw.replace(/[\s.\-\/]/g, '').toUpperCase();

  // RFC México: starts with letters
  if (/^[A-ZÑ&]{3,4}\d{6}/.test(clean)) return { detected: 'rfc', country: 'mx' };
  // RUT Chile: has K or dash pattern
  if (/^\d{7,8}K?$/.test(clean) && clean.length <= 9) return { detected: 'rut', country: 'cl' };
  // CUIT Argentina: 11 digits, prefix 20-34
  if (/^\d{11}$/.test(clean) && ['20','23','24','25','26','27','30','33','34'].includes(clean.slice(0,2))) {
    return { detected: 'cuit', country: 'ar' };
  }
  // CNPJ Brasil: 14 digits
  if (/^\d{14}$/.test(clean)) return { detected: 'cnpj', country: 'br' };
  // CPF Brasil: 11 digits
  if (/^\d{11}$/.test(clean)) return { detected: 'cpf', country: 'br' };
  // NIT Colombia: 9-10 digits
  if (/^\d{9,10}$/.test(clean)) return { detected: 'nit', country: 'co' };

  return { detected: null, country: null };
}

module.exports = { validateCUIT, validateRUT, validateCPF, validateCNPJ, validateNIT, validateRFC, validateRUTUruguay, autoDetect };
