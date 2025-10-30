import express from 'express';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Convierte un string con formato tipo key=value a un objeto mínimo con { statuses: [{ name, jobId }, ...] }
function parseLooseJsonMalla(input) {
  if (typeof input !== 'string') return null;
  try {
    const result = { statuses: [] };
    const statusesSectionMatch = input.match(/statuses=\[(.*?)]/s);
    if (!statusesSectionMatch) return result;
    const inner = statusesSectionMatch[1];
    const rawItems = inner.split(/}\s*,\s*\{/g).map((chunk, idx, arr) => {
      let c = chunk;
      if (!c.startsWith('{')) c = '{' + c;
      if (!c.endsWith('}')) c = c + '}';
      return c;
    });
    for (const item of rawItems) {
      const jobIdMatch = item.match(/(?:^|,)\s*jobId=([^,}]+)/);
      const nameMatch = item.match(/(?:^|,)\s*name=([^,}]+)/);
      const jobId = jobIdMatch ? jobIdMatch[1].trim() : undefined;
      const name = nameMatch ? nameMatch[1].trim() : undefined;
      result.statuses.push({ jobId, name });
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
  }
  const statusesFromSecond = statuses.slice(1);
  const namesSet = new Set(requestedJobs);
  const jobIds = statusesFromSecond
    .filter(s => s && typeof s.name === 'string' && namesSet.has(s.name))
    .map(s => s.jobId)
    .filter(id => typeof id === 'string');

  res.json({ jobIds });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});


