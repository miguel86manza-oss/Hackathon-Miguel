// Datos de ejemplo — se muestran cuando no hay Sheets conectados aún.
// Simulan 3 sesiones con 6 respondientes cada una, mostrando progreso en el tiempo.

import { PULSO_QUESTIONS, AVANCE_OBJETIVOS } from '../lib/schema.js'

// Generador pseudo-aleatorio determinístico (seed fijo)
function prng(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Genera una sesión con N respondientes
function genSession(dateStr, nResponses, baselineByQ, scale = 5, seed = 1) {
  const rand = prng(seed)
  const rows = []
  for (let i = 0; i < nResponses; i++) {
    const responses = {}
    for (const q of Object.keys(baselineByQ)) {
      // Variación +/- 1 con algo de ruido
      const base = baselineByQ[q]
      const noise = (rand() - 0.5) * 1.2
      let v = Math.round(base + noise)
      if (v < 1) v = 1
      if (v > scale) v = scale
      responses[q] = v
    }
    rows.push({
      responseId: `mock-${dateStr}-${i}`,
      timestamp: new Date(dateStr),
      rawTimestamp: dateStr,
      responses,
    })
  }
  return { date: new Date(dateStr), rows }
}

// --- PULSO DE COALICIÓN (3 sesiones con progreso) ---
const pulsoSession1 = genSession('2026-01-15T10:00:00', 6, {
  q1: 3.2, q2: 3.5, q3: 2.5, q4: 2.3, q5: 2.8,
  q6: 3.0, q7: 3.2, q8: 2.5, q9: 3.3, q10: 2.8,
}, 5, 101)

const pulsoSession2 = genSession('2026-02-20T10:00:00', 6, {
  q1: 3.8, q2: 4.0, q3: 3.3, q4: 3.2, q5: 3.5,
  q6: 3.7, q7: 3.8, q8: 3.2, q9: 3.8, q10: 3.3,
}, 5, 102)

const pulsoSession3 = genSession('2026-03-25T10:00:00', 6, {
  q1: 4.3, q2: 4.5, q3: 4.0, q4: 4.0, q5: 4.2,
  q6: 4.2, q7: 4.3, q8: 3.8, q9: 4.3, q10: 3.8,
}, 5, 103)

export const MOCK_PULSO_ROWS = [
  ...pulsoSession1.rows,
  ...pulsoSession2.rows,
  ...pulsoSession3.rows,
]

// --- AVANCE DE OBJETIVOS (3 sesiones con progreso) ---
// Sesiones 1 y 2: estructura original con o3 (Visión de cambio)
const avanceSession1 = genSession('2026-01-15T10:00:00', 6, {
  o1: 1.3, o2: 1.2, o3: 1.1,
}, 3, 201)
const avanceSession2 = genSession('2026-02-20T10:00:00', 6, {
  o1: 2.2, o2: 1.8, o3: 1.7,
}, 3, 202)
// Sesión 3: nueva estructura con o4, o5, o6 (sin o3)
const avanceSession3 = genSession('2026-04-26T10:00:00', 6, {
  o1: 2.8, o2: 2.5, o4: 1.5, o5: 1.3, o6: 1.2,
}, 3, 203)

export const MOCK_AVANCE_ROWS = [
  ...avanceSession1.rows,
  ...avanceSession2.rows,
  ...avanceSession3.rows,
]
