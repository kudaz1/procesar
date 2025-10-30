import express from 'express';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Convierte un string con formato tipo key=value a un objeto mínimo con { statuses: [{ name, jobId }, ...] }
function parseLooseJsonMalla(input) {
  if (typeof input !== 'string') return null;
  try {
    const result = { statuses: [] };
    const key = 'statuses=[';
    const start = input.indexOf(key);
    if (start === -1) return result;
    const startIdx = start + key.length;
    // Scan forward to find the matching ] that closes the statuses array,
    // ignoring any nested [ ... ] segments inside objects
    let i = startIdx;
    let braceDepth = 0; // depth for { }
    let endIdx = -1;
    while (i < input.length) {
      const ch = input[i];
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === ']' && braceDepth === 0) { endIdx = i; break; }
      i++;
    }
    if (endIdx === -1) return result;
    const inner = input.slice(startIdx, endIdx);

    // Split top-level objects: we are inside statuses content
    const chunks = [];
    let current = '';
    braceDepth = 0;
    for (let j = 0; j < inner.length; j++) {
      const ch = inner[j];
      if (ch === '{') {
        braceDepth++;
        current += ch;
      } else if (ch === '}') {
        braceDepth--;
        current += ch;
        if (braceDepth === 0) {
          chunks.push(current);
          current = '';
          // skip following comma and spaces
          while (j + 1 < inner.length && /[\s,]/.test(inner[j + 1])) j++;
        }
      } else {
        current += ch;
      }
    }

    if (chunks.length > 0) {
      for (const item of chunks) {
        const jobIdMatch = item.match(/(?:^|,)\s*jobId=([^,}]+)/);
        const nameMatch = item.match(/(?:^|,)\s*name=([^,}]+)/);
        const jobId = jobIdMatch ? jobIdMatch[1].trim() : undefined;
        const name = nameMatch ? nameMatch[1].trim() : undefined;
        result.statuses.push({ jobId, name });
      }
    } else {
      // Fallback: regex por pares jobId...name dentro del texto de statuses
      const pairRegex = /jobId=([^,}]+)[\s\S]*?name=([^,}\n]+)/g;
      let m;
      while ((m = pairRegex.exec(inner)) !== null) {
        const jobId = (m[1] || '').trim();
        const name = (m[2] || '').trim();
        result.statuses.push({ jobId, name });
      }
    }
    return result;
  } catch (_) {
    return null;
  }
}

// Healthcheck
app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

// POST /procesar
// Body: { nombreJob: string, jsonMalla: { statuses: Array<{ name: string }> } }
app.post('/procesar', (req, res) => {
  const { nombreJob, jsonMalla } = req.body || {};

  if (typeof nombreJob !== 'string' || !nombreJob.trim()) {
    return res.status(400).json({ error: 'nombreJob es requerido y debe ser string' });
  }
  // No validar estructura de jsonMalla: tratar faltantes como vacíos

  const requestedJobs = String(nombreJob || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Ignora el primer elemento global de statuses y filtra por los nombreJob indicados
  // Permitir jsonMalla como objeto o como string tipo key=value
  let statuses = [];
  if (jsonMalla && Array.isArray(jsonMalla.statuses)) {
    statuses = jsonMalla.statuses;
  } else if (typeof jsonMalla === 'string') {
    const parsed = parseLooseJsonMalla(jsonMalla);
    statuses = parsed && Array.isArray(parsed.statuses) ? parsed.statuses : [];
    // Fallback adicional: extraer pares globalmente si no se obtuvo nada
    if (statuses.length === 0) {
      const pairs = [];
      const re = /jobId=([^,}\s]+)[\s\S]*?name=([^,}\n]+)/g;
      let m;
      while ((m = re.exec(jsonMalla)) !== null) {
        pairs.push({ jobId: (m[1] || '').trim(), name: (m[2] || '').trim() });
      }
      if (pairs.length > 0) {
        statuses = pairs;
      }
    }
  }
  const statusesFromSecond = statuses.slice(1);
  const normalize = v => String(v ?? '').trim().replace(/^"|"$/g, '').toLowerCase();
  const namesSet = new Set(requestedJobs.map(normalize));
  let jobIds = statusesFromSecond
    .filter(s => s && typeof s.name !== 'undefined')
    .filter(s => namesSet.has(normalize(s.name)))
    .map(s => s.jobId)
    .filter(id => typeof id === 'string' && id.length > 0);

  // Fallback: si no se detectó nada y el jsonMalla era string, intenta una extracción directa
  if (jobIds.length === 0 && typeof jsonMalla === 'string') {
    const parsed = parseLooseJsonMalla(jsonMalla) || { statuses: [] };
    const altFromSecond = (parsed.statuses || []).slice(1);
    jobIds = altFromSecond
      .filter(s => s && typeof s.name !== 'undefined')
      .filter(s => namesSet.has(normalize(s.name)))
      .map(s => s.jobId)
      .filter(id => typeof id === 'string' && id.length > 0);
  }

  res.json({ jobIds });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});


