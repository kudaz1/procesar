# API SetOK

API mínima en Node/Express para procesar `nombreJob` y `jsonMalla`.

## Ejecutar

Requisitos: Node.js 18+

```bash
npm install
npm run start
# o en desarrollo con autoreload (Node 18+)
npm run dev
```

La API escuchará en `http://localhost:3000`.

## Endpoints

- `GET /` → healthcheck `{ status: 'ok' }`.
- `POST /procesar` → procesa `nombreJob` y `jsonMalla`.

### Request de ejemplo
```json
{
  "nombreJob": "test1, test2",
  "jsonMalla": {
    "statuses": [
      { "name": "Test-Carlos-MallaOK" },
      { "name": "test1" },
      { "name": "test2" }
    ]
  }
}
```

`nombreJob` puede ser una o varias palabras separadas por coma. Se cuentan las ocurrencias exactas por job dentro de `jsonMalla.statuses[*].name` y se devuelven solo a partir de la segunda coincidencia por cada job.

### Response de ejemplo
```json
{
  "requestedJobs": ["test1", "test2"],
  "perJob": [
    { "job": "test1", "count": 1, "namesFromSecondOnward": [] },
    { "job": "test2", "count": 1, "namesFromSecondOnward": [] }
  ]
}
```

- `count` → número total de coincidencias exactas por job.
- `namesFromSecondOnward` → coincidencias desde la segunda en adelante (omitiendo la primera).
