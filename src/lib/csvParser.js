import Papa from 'papaparse'
import { PULSO_QUESTIONS, AVANCE_OBJETIVOS, META_COLS } from './schema.js'

/**
 * Convierte una URL de Google Sheets a su URL de descarga CSV.
 * Si se pasa sheetName, usa el endpoint gviz/tq que permite especificar la pestaña por nombre.
 * Requiere que la hoja esté compartida con "Cualquier persona con el enlace puede ver".
 * Devuelve null si no puede parsear el ID del spreadsheet.
 */
export function toCsvUrl(rawUrl, sheetName = null) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const url = rawUrl.trim()

  // Extraer el ID del spreadsheet (funciona con URLs de edición, pub y export)
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) return null
  const id = idMatch[1]

  // Si se especifica nombre de pestaña, usar gviz/tq (acepta nombre directo sin necesitar GID)
  if (sheetName && sheetName.trim()) {
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName.trim())}`
  }

  // Sin nombre de pestaña: URL ya publicada como CSV — la dejamos tal cual
  if (/\/pub(\?|$)/.test(url) && /output=csv/.test(url)) return url

  // Ya está publicada (formato /pub) pero sin output=csv
  if (/\/spreadsheets\/d\/e\//.test(url)) {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}output=csv`
  }

  // URL de edición clásica — export por GID (lee la pestaña del gid indicado)
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

/**
 * Parsea un CSV publicado de Google Sheets con formato Cosude/Recopilador.
 * @returns { meta, rows } — rows es un array de { timestamp, responses: {q1: val, ...} }
 */
export async function fetchAndParseCsv(csvUrl, schemaType = 'pulso') {
  const resp = await fetch(csvUrl)
  if (!resp.ok) {
    throw new Error(`No se pudo acceder al Sheet (HTTP ${resp.status}). Verificá que esté compartido con "Cualquier persona con el enlace puede ver".`)
  }
  const text = await resp.text()

  const parsed = Papa.parse(text, {
    skipEmptyLines: false,
  })

  if (parsed.errors.length > 0 && parsed.errors[0].type === 'Delimiter') {
    throw new Error('No se pudo leer la hoja. Verificá que la URL sea de Google Sheets y que esté compartida con acceso público de lectura.')
  }

  const matrix = parsed.data

  // --- Detectar fila de headers con las preguntas ---
  // En los recopiladores Cosude, las preguntas están en la ÚLTIMA fila que contiene
  // la primera pregunta. Buscamos qué fila contiene la primera pregunta del esquema.
  const questions = schemaType === 'pulso' ? PULSO_QUESTIONS : AVANCE_OBJETIVOS
  const firstQuestionTarget = normalize(questions[0].full).replace(/[.!?,;]+$/, '').trim().slice(0, 40)

  let headerRowIdx = -1
  const colMap = {}  // questionId -> columnIndex

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r]
    for (let c = 0; c < row.length; c++) {
      const cellNorm = normalize(row[c]).replace(/[.!?,;]+$/, '').trim()
      if (cellNorm.includes(firstQuestionTarget) || firstQuestionTarget.includes(cellNorm.slice(0, 25))) {
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
  const headerRow = matrix[headerRowIdx]
  for (const q of questions) {
    // Strip trailing punctuation before comparing — some sheets omit the final period
    const target = normalize(q.full).replace(/[.!?,;]+$/, '').trim().slice(0, 40)
    for (let c = 0; c < headerRow.length; c++) {
      const cellNorm = normalize(headerRow[c]).replace(/[.!?,;]+$/, '').trim()
      if (cellNorm.includes(target) || target.includes(cellNorm.slice(0, 25))) {
        colMap[q.id] = c
        break
      }
    }
  }

  const foundCount = Object.keys(colMap).length
  if (foundCount < questions.length) {
    console.warn(`Solo se mapearon ${foundCount} de ${questions.length} preguntas`)
  }

  // --- Detectar columna de timestamp dinámicamente ---
  // Buscamos en todas las filas hasta (e incluyendo) el header alguna celda con texto
  // de fecha/hora. Si no se encuentra, quedamos sin timestamp (filas agrupadas en una sola sesión).
  const tsKeywords = ['timestamp', 'marca de tiempo', 'fecha', 'time', 'hora', 'date']
  let timestampColIdx = null
  outer: for (let r = 0; r <= headerRowIdx; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      const cellNorm = normalize(matrix[r][c])
      if (tsKeywords.some(kw => cellNorm.includes(kw))) {
        timestampColIdx = c
        break outer
      }
    }
  }
  // Fallback al índice fijo original si el header no lo reveló
  if (timestampColIdx === null) timestampColIdx = META_COLS.timestamp

  // --- Extraer filas de respuestas ---
  const rows = []
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r]

    // Saltar filas completamente vacías
    if (row.every(cell => !cell || !String(cell).trim())) continue

    const ts = row[timestampColIdx]

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

    if (hasAnyResponse) {
      rows.push({
        timestamp: parseTimestamp(ts),
        rawTimestamp: ts || '',
        responseId: row[META_COLS.responseId] || '',
        responses,
      })
    }
  }

  return {
    meta: {
      totalResponses: rows.length,
      questionsFound: foundCount,
      questionsTotal: questions.length,
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

/** Parsea el timestamp del CSV. Acepta mm/dd/yyyy y mm/dd/yyyy hh:mm:ss */
function parseTimestamp(ts) {
  if (!ts) return null
  const s = String(ts).trim()
  // Formato mm/dd/yyyy hh:mm:ss
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const [_, mm, dd, yyyy, hh = '0', mi = '0', ss = '0'] = m
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
    // Si no hay timestamp, todas las filas sin fecha van a un grupo único
    const key = row.timestamp ? dateKey(row.timestamp) : '__sin_fecha__'
    if (!groups.has(key)) {
      groups.set(key, {
        sessionKey: key,
        date: row.timestamp || null,
        rows: [],
      })
    }
    groups.get(key).rows.push(row)
  }

  // Ordenar cronológicamente; el grupo sin fecha va al final
  const sorted = Array.from(groups.values()).sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date - b.date
  })

  return sorted.map((g, i) => ({
    ...g,
    label: `Sesión ${i + 1}`,
    shortDate: g.date ? formatShortDate(g.date) : 'Actual',
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
