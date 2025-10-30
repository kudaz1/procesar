import express from 'express';

const app = express();
app.use(express.json({ limit: '2mb' }));

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
  if (!jsonMalla || !Array.isArray(jsonMalla.statuses)) {
    return res.status(400).json({ error: 'jsonMalla.statuses es requerido y debe ser un arreglo' });
  }

  const requestedJobs = nombreJob
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Ignora el primer elemento global de statuses y filtra por los nombreJob indicados
  const statusesFromSecond = jsonMalla.statuses.slice(1);
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


