import Papa from 'papaparse'
import { PULSO_QUESTIONS, AVANCE_OBJETIVOS } from './schema.js'

/**
 * Convierte una URL normal de Google Sheets a la URL pública publicada en CSV.
 * Acepta cualquiera de:
 *  - https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
 *  - https://docs.google.com/spreadsheets/d/<ID>/pub?output=csv
 *  - https://docs.google.com/spreadsheets/d/e/<LONG_ID>/pub?output=csv  (URL ya publicada)
 * Devuelve null si no puede parsear.
 */
export function toCsvUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const url = rawUrl.trim()

  // Ya está publicada como CSV — la dejamos tal cual
  if (/\/pub(\?|$)/.test(url) && /output=csv/.test(url)) return url

  // Ya está publicada (formato /pub) pero sin output=csv
  const pubMatch = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\/pub/)
  if (pubMatch) {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}output=csv`
  }

  // URL de edit clásica — extraemos ID y GID
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (idMatch) {
    const id = idMatch[1]
    const gidMatch = url.match(/[?&#]gid=([0-9]+)/)
    const gid = gidMatch ? gidMatch[1] : '0'
    // Formato export — sirve si la hoja es accesible públicamente,
    // PERO muchas veces CORS bloquea esto. La vía recomendada es pub?output=csv.
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
  }

  return null
}

/**
 * Parsea un CSV publicado de Google Sheets con formato Cosude/Recopilador.
 * @returns { meta, rows } — rows es un array de { timestamp, responses: {q1: val, ...} }
 */
export async function fetchAndParseCsv(csvUrl, schemaType = 'pulso') {
  const resp = await fetch(csvUrl)
  if (!resp.ok) {
    throw new Error(`No se pudo acceder al Sheet (HTTP ${resp.status}). Verificá que esté publicado como CSV.`)
  }
  const text = await resp.text()

  const parsed = Papa.parse(text, {
    skipEmptyLines: false,
  })

  if (parsed.errors.length > 0 && parsed.errors[0].type === 'Delimiter') {
    throw new Error('El archivo no parece un CSV válido. ¿Publicaste la hoja como CSV?')
  }

  const matrix = parsed.data

  // --- Detectar fila de headers con las preguntas ---
  // En los recopiladores Cosude, las preguntas están en la ÚLTIMA fila que contiene
  // la primera pregunta. Buscamos qué fila contiene la primera pregunta del esquema.
  const questions = schemaType === 'pulso' ? PULSO_QUESTIONS : AVANCE_OBJETIVOS
  const firstQuestionText = normalize(questions[0].full)

  let headerRowIdx = -1
  const colMap = {}  // questionId -> columnIndex

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r]
    for (let c = 0; c < row.length; c++) {
      if (normalize(row[c]).includes(firstQuestionText.slice(0, 40))) {
        headerRowIdx = r
        break
      }
    }
    if (headerRowIdx >= 0) break
  }

  if (headerRowIdx < 0) {
    throw new Error(
      'No se encontraron las preguntas esperadas en el Sheet. ' +
      'Verificá que sea el recopilador correcto (Pulso de Coalición o Avance de Objetivos).'
    )
  }

  // Mapear cada pregunta a su columna, buscando match por texto normalizado
  // Se elimina puntuación final antes de comparar para tolerar hojas que omiten el punto
  const headerRow = matrix[headerRowIdx]
  for (const q of questions) {
    const target = normalize(q.full).replace(/[.!?,;]+$/, '').trim().slice(0, 40)
    for (let c = 0; c < headerRow.length; c++) {
      const cell = normalize(headerRow[c]).replace(/[.!?,;]+$/, '').trim()
      if (cell.includes(target) || (target.length >= 20 && target.includes(cell.slice(0, 25)))) {
        colMap[q.id] = c
        break
      }
    }
  }

  const foundCount = Object.keys(colMap).length
  // --- Detectar columna de timestamp dinámicamente ---
  // Buscamos "marca de tiempo" o "timestamp" en la fila de headers.
  // Si no se encuentra, probamos con las primeras columnas hasta dar con una que
  // contenga una fecha válida en la primera fila de datos.
  let tsCol = -1
  for (let c = 0; c < headerRow.length; c++) {
    const h = normalize(headerRow[c])
    if (h.includes('marca de tiempo') || h.includes('timestamp') || h.includes('fecha')) {
      tsCol = c
      break
    }
  }
  if (tsCol < 0) {
    // Buscar la primera columna de datos que contenga algo que parezca fecha
    const firstDataRow = matrix[headerRowIdx + 1] || []
    for (let c = 0; c < Math.min(firstDataRow.length, 10); c++) {
      if (parseTimestamp(firstDataRow[c]) !== null) { tsCol = c; break }
    }
  }

  // --- Extraer filas de respuestas ---
  const rows = []
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r]

    const responses = {}
    let hasAnyResponse = false
    for (const q of questions) {
      const c = colMap[q.id]
      if (c == null) continue
      const raw = row[c]
      const num = parseLikertValue(raw)
      if (num != null) {
        responses[q.id] = num
        hasAnyResponse = true
      }
    }

    if (!hasAnyResponse) continue

    const tsRaw = tsCol >= 0 ? (row[tsCol] || '') : ''
    const ts = parseTimestamp(tsRaw)

    rows.push({
      timestamp: ts,
      rawTimestamp: tsRaw,
      responseId: row[0] || '',
      responses,
    })
  }

  return {
    meta: {
      totalResponses: rows.length,
      questionsFound: foundCount,
      questionsTotal: questions.length,
      headerRowIdx,
      tsCol,
      firstTsValue: tsCol >= 0 ? ((matrix[headerRowIdx + 1] || [])[tsCol] || '') : '',
    },
    rows,
  }
}

/** Normaliza texto para matching: minúsculas, sin acentos, sin whitespace excesivo */
function normalize(s) {
  if (s == null) return ''
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parsea un valor Likert. Acepta números, o texto tipo "4. De acuerdo". */
function parseLikertValue(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  // Buscar el primer dígito 1-5
  const m = s.match(/^([1-5])/)
  if (m) return parseInt(m[1], 10)
  // Si es solo un número sin prefijo
  const n = parseFloat(s)
  if (!isNaN(n) && n >= 1 && n <= 5) return Math.round(n)
  return null
}

const MONTH_NAMES = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 }

/** Parsea el timestamp del CSV. Acepta múltiples formatos de fecha. */
function parseTimestamp(ts) {
  if (!ts) return null
  const s = String(ts).trim()

  // Formato: "Mon 20 Apr, 18:34:43 GMT 2026"
  const mNamed = s.match(/^\w{3}\s+(\d{1,2})\s+(\w{3}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s+\w+\s+(\d{4})/)
  if (mNamed) {
    const [_, dd, mon, hh, mi, ss, yyyy] = mNamed
    const month = MONTH_NAMES[mon.toLowerCase()]
    if (month !== undefined)
      return new Date(parseInt(yyyy), month, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss))
  }

  // Formato mm/dd/yyyy hh:mm:ss  (barras, mes primero)
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (mSlash) {
    const [_, mm, dd, yyyy, hh = '0', mi = '0', ss = '0'] = mSlash
    const y = yyyy.length === 2 ? 2000 + parseInt(yyyy, 10) : parseInt(yyyy, 10)
    return new Date(y, parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss))
  }

  // Formato yy-mm-dd o yyyy-mm-dd  (guiones, año primero)
  const mDash = s.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (mDash) {
    const [_, yyyy, mm, dd, hh = '0', mi = '0', ss = '0'] = mDash
    const y = yyyy.length === 2 ? 2000 + parseInt(yyyy, 10) : parseInt(yyyy, 10)
    return new Date(y, parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss))
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Agrupa las respuestas en "sesiones" — usamos la fecha (día) como clave.
 * Si varias respuestas caen en el mismo día, se asume que son la misma sesión.
 * @returns [{ sessionKey, date, label, rows }]
 */
export function groupBySessions(rows) {
  const groups = new Map()
  for (const row of rows) {
    const date = row.timestamp || new Date(0)  // filas sin fecha → grupo "época 0"
    const key = row.timestamp ? dateKey(date) : '__no_date__'
    if (!groups.has(key)) {
      groups.set(key, {
        sessionKey: key,
        date,
        rows: [],
      })
    }
    groups.get(key).rows.push(row)
  }

  // Ordenar cronológicamente y asignar label Sesión 1, 2, ...
  const sorted = Array.from(groups.values()).sort((a, b) => a.date - b.date)
  return sorted.map((g, i) => ({
    ...g,
    label: `Sesión ${i + 1}`,
    shortDate: formatShortDate(g.date),
  }))
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(d) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

/**
 * Calcula el promedio por pregunta dentro de una sesión
 * @returns { q1: 4.2, q2: 3.8, ... , overall: 4.0 }
 */
export function sessionAverages(session, questions) {
  const out = {}
  let total = 0, count = 0
  for (const q of questions) {
    const vals = session.rows
      .map(r => r.responses[q.id])
      .filter(v => v != null)
    if (vals.length === 0) continue
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    out[q.id] = Math.round(avg * 100) / 100
    total += avg
    count += 1
  }
  out.overall = count ? Math.round((total / count) * 100) / 100 : 0
  out.n = session.rows.length
  return out
}

/**
 * Calcula delta entre la última sesión y la anterior
 */
export function deltaBetweenSessions(avgCurrent, avgPrevious) {
  if (!avgPrevious) return null
  return Math.round((avgCurrent.overall - avgPrevious.overall) * 100) / 100
}

/**
 * Para el gráfico de distribución: cuenta cuántas respuestas de cada nivel
 * (1..5 o 1..3) en la última sesión, agregando todas las preguntas.
 */
export function distributionCounts(session, questions, scale) {
  const counts = {}
  for (let i = 1; i <= scale; i++) counts[i] = 0
  for (const row of session.rows) {
    for (const q of questions) {
      const v = row.responses[q.id]
      if (v != null && counts[v] !== undefined) counts[v]++
    }
  }
  return counts
}
