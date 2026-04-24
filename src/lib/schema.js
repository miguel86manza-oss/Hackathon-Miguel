// Esquema de la data esperada desde los Google Sheets
// Las preguntas vienen exactamente como aparecen en los recopiladores de Cosude 2026

// --- PULSO DE COALICIÓN ---
// Escala Likert 1-5 (1=Muy en desacuerdo ... 5=Muy de acuerdo)
// Son 10 dimensiones/afirmaciones
export const PULSO_QUESTIONS = [
  { id: 'q1',  short: 'Beneficios del cambio',  full: 'Como equipo estamos convencidos de los beneficios del cambio.' },
  { id: 'q2',  short: 'Urgencia del cambio',    full: 'Como equipo estamos de acuerdo con el hecho de que cambiar es urgente.' },
  { id: 'q3',  short: 'Barreras identificadas', full: 'Tenemos identificadas las barreras que debemos remover para movilizar el cambio.' },
  { id: 'q4',  short: 'Iniciativas concretas',  full: 'Tenemos definidas iniciativas concretas para llevar adelante el cambio.' },
  { id: 'q5',  short: 'Claridad de acción',     full: 'Como equipo tenemos claridad sobre cómo actuar para lograr los objetivos definidos.' },
  { id: 'q6',  short: 'Actores relevantes',     full: 'Tenemos identificados a todos los actores relevantes para movilizar el cambio.' },
  { id: 'q7',  short: 'Trabajo conjunto',       full: 'Ya estamos trabajando juntos para enfrentar los desafíos del cambio.' },
  { id: 'q8',  short: 'Conversaciones difíciles', full: 'Nos sentimos en capacidad de sostener conversaciones difíciles para lograr los objetivos definidos en este proyecto.' },
  { id: 'q9',  short: 'Confianza para pedir ayuda', full: 'Nos sentimos en confianza para pedir ayuda entre nosotros cuando la necesitemos.' },
  { id: 'q10', short: 'Exposición sin miedo',   full: 'Estamos conformando un espacio donde podemos exponernos sin miedo a recibir críticas a nuestras espaldas.' },
]

export const LIKERT_LABELS = {
  1: 'Muy en desacuerdo',
  2: 'En desacuerdo',
  3: 'Ni de acuerdo ni en desacuerdo',
  4: 'De acuerdo',
  5: 'Muy de acuerdo',
}

// --- REGISTRO DE AVANCE DE OBJETIVOS ---
// Escala 1-3 (1=No realizado, 2=En proceso, 3=Realizado)
// Son 3 objetivos
export const AVANCE_OBJETIVOS = [
  { id: 'o1', short: 'Propósito de equipo',     full: 'Propósito de equipo redactado.' },
  { id: 'o2', short: 'Gran Oportunidad',        full: 'Gran oportunidad formulada.' },
  { id: 'o3', short: 'Visión de cambio',        full: 'Visión de cambio esbozada.' },
]

export const AVANCE_LABELS = {
  1: 'No realizado',
  2: 'En proceso',
  3: 'Realizado',
}

// Columnas fijas de metadata en los recopiladores de Cosude
// (índices basados en 0; coinciden con la estructura vista en los xlsx)
export const META_COLS = {
  responseId: 0,
  status:     1,
  ip:         2,
  timestamp:  3,   // 'Marca de tiempo (mm/dd/yyyy)'
}
