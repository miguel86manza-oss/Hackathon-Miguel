import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'
import { PULSO_QUESTIONS, PULSO_DIMENSIONS } from '../lib/schema.js'
import { groupBySessions } from '../lib/csvParser.js'

const DIMS = [...PULSO_DIMENSIONS].sort((a, b) => a.id.localeCompare(b.id))
const ALL_IDS = PULSO_QUESTIONS.map(q => q.id)

function computeFav(session, qids) {
  // Calcula % por pregunta y promedia — así el resultado coincide con
  // el promedio manual de los porcentajes individuales de cada afirmación.
  let favSum = 0, neuSum = 0, disSum = 0, count = 0
  for (const qid of qids) {
    let f = 0, n = 0, d = 0, t = 0
    for (const row of session.rows) {
      const v = row.responses[qid]
      if (v != null) {
        t++
        if (v >= 4) f++
        else if (v === 3) n++
        else d++
      }
    }
    if (t > 0) { favSum += f / t; neuSum += n / t; disSum += d / t; count++ }
  }
  if (count === 0) return { favorable: 0, neutral: 0, unfavorable: 0, n: 0 }
  const pct = x => Math.round(x / count * 1000) / 10
  return { favorable: pct(favSum), neutral: pct(neuSum), unfavorable: pct(disSum), n: session.rows.length }
}

function FavTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      <div className="tooltip__title">{label}</div>
      {payload.map(p => (
        <div className="tooltip__row" key={p.dataKey}>
          <span>{p.name}</span>
          <strong className="tooltip__accent">{p.value.toFixed(1)}%</strong>
        </div>
      ))}
    </div>
  )
}

export default function PulsoDashboard({ rows, isDemo }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card empty">
        <strong>Sin datos del Pulso de Coalición.</strong><br />
        Conectá el Sheet correspondiente desde la configuración para ver las métricas.
      </div>
    )
  }

  const sessions = groupBySessions(rows)
  if (sessions.length === 0) {
    return <div className="card empty"><strong>No se detectaron sesiones válidas.</strong> Verificá la columna de timestamp del Sheet.</div>
  }

  const perSession = sessions.map(s => ({
    session: s,
    fav: computeFav(s, ALL_IDS),
    qFav: Object.fromEntries(PULSO_QUESTIONS.map(q => [q.id, computeFav(s, [q.id]).favorable])),
  }))

  const lastIdx = perSession.length - 1

  // 'all' muestra todas las sesiones; número = índice de sesión seleccionada
  const [filterIdx, setFilterIdx] = useState(lastIdx)

  const isAll = filterIdx === 'all'
  const safeIdx = isAll ? lastIdx : Math.min(filterIdx, lastIdx)

  // Para KPIs usamos siempre la sesión "focal": la seleccionada o la última si es "all"
  const focused    = perSession[safeIdx]
  const prevFocused = safeIdx > 0 ? perSession[safeIdx - 1] : null
  const first      = perSession[0]

  const globalFav = focused.fav.favorable
  const delta     = prevFocused ? Math.round((globalFav - prevFocused.fav.favorable) * 10) / 10 : null
  const variation = Math.round((globalFav - first.fav.favorable) * 10) / 10

  // Sesiones visibles en las secciones comparativas
  const visibleSessions = isAll ? perSession : [perSession[safeIdx]]

  // Línea temporal — siempre muestra todas las sesiones para dar contexto
  const timelineData = perSession.map(({ session, fav }) => ({
    session: session.label,
    Favorabilidad: fav.favorable,
  }))

  return (
    <>
      {/* === Filtro de sesión === */}
      <div className="session-filter">
        <span className="session-filter__label">Sesión seleccionada:</span>
        <button
          className={`session-pill ${isAll ? 'active' : ''}`}
          onClick={() => setFilterIdx('all')}
        >
          Todas
        </button>
        {perSession.map(({ session }, idx) => (
          <button
            key={session.label}
            className={`session-pill ${!isAll && safeIdx === idx ? 'active' : ''}`}
            onClick={() => setFilterIdx(idx)}
          >
            {session.label} · {session.shortDate}
          </button>
        ))}
      </div>

      {/* === KPIs === */}
      <div className="kpis">
        <div className="kpi kpi--primary">
          <div className="kpi__label">Favorabilidad global de coalición</div>
          <div className="kpi__value">
            {globalFav.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">
            {focused.session.label} ({focused.session.shortDate}) · n = {focused.session.rows.length} resp.
          </div>
          {delta != null && (
            <div className={`kpi__delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '◆'} {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs sesión anterior
            </div>
          )}
        </div>

        <div className="kpi">
          <div className="kpi__label">Sesiones registradas</div>
          <div className="kpi__value">{sessions.length}</div>
          <div className="kpi__caption">{first.session.shortDate} → {perSession[lastIdx].session.shortDate}</div>
        </div>

        <div className="kpi">
          <div className="kpi__label">Variación total</div>
          <div className="kpi__value" style={{ color: variation >= 0 ? 'var(--turquesa-sec)' : 'var(--magenta-2)' }}>
            {variation >= 0 ? '+' : ''}{variation.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">Favorabilidad desde primera sesión</div>
        </div>
      </div>

      {/* === Evolución de favorabilidad === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Evolución de favorabilidad entre sesiones</h3>
            <p className="card__subtitle">% de respuestas favorables (4 y 5) · todas las dimensiones</p>
          </div>
          <span className="card__meta">{sessions.length} sesiones · escala 0–100%</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={timelineData} margin={{ top: 8, right: 20, bottom: 8, left: -10 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="session"
                axisLine={{ stroke: 'var(--border-strong)' }}
                tickLine={false}
                tick={{ fill: 'var(--text-soft)', fontSize: 12, fontFamily: 'Poppins' }}
                dy={6}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={v => v + '%'}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-mute)', fontSize: 11, fontFamily: 'Poppins' }}
              />
              <Tooltip content={<FavTooltip />} cursor={{ stroke: 'var(--turquesa)', strokeDasharray: '3 3' }} />
              <ReferenceLine y={50} stroke="var(--gris-3)" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="Favorabilidad"
                stroke="var(--turquesa)"
                strokeWidth={3}
                dot={{ r: 5, fill: 'var(--white)', stroke: 'var(--turquesa)', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: 'var(--turquesa)', stroke: 'var(--white)', strokeWidth: 2 }}
              />
              <ReferenceDot
                x={focused.session.label}
                y={focused.fav.favorable}
                r={9}
                fill="var(--magenta-1)"
                stroke="var(--white)"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* === Distribución por dimensión (barras apiladas horizontales por sesión) === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Distribución por dimensión</h3>
            <p className="card__subtitle">Comparativa por sesión · favorabilidad, neutralidad y desfavorabilidad</p>
          </div>
        </div>

        <div className="dim-stacks">
          {DIMS.map(dim => (
            <div className="dim-stack-block" key={dim.id}>
              <div className="dim-stack-block__label">{dim.label}</div>
              {visibleSessions.map(({ session }, idx) => {
                const stats = computeFav(session, dim.questions)
                const origIdx = perSession.findIndex(p => p.session.label === session.label)
                return (
                  <div className={`stack-row ${origIdx === safeIdx && !isAll ? 'stack-row--active' : ''}`} key={session.label}>
                    <span className="stack-row__label">{session.label}</span>
                    <div className="stack-row__bar">
                      {stats.unfavorable > 0 && (
                        <div className="stack-row__seg stack-row__seg--unf" style={{ width: `${stats.unfavorable}%` }}>
                          {stats.unfavorable >= 8 ? `${stats.unfavorable.toFixed(0)}%` : ''}
                        </div>
                      )}
                      {stats.neutral > 0 && (
                        <div className="stack-row__seg stack-row__seg--neu" style={{ width: `${stats.neutral}%` }}>
                          {stats.neutral >= 8 ? `${stats.neutral.toFixed(0)}%` : ''}
                        </div>
                      )}
                      {stats.favorable > 0 && (
                        <div className="stack-row__seg stack-row__seg--fav" style={{ width: `${stats.favorable}%` }}>
                          {stats.favorable >= 8 ? `${stats.favorable.toFixed(0)}%` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="stack-legend">
          <span className="stack-legend__item"><span className="stack-legend__sw stack-legend__sw--unf" />Desfavorable (1–2)</span>
          <span className="stack-legend__item"><span className="stack-legend__sw stack-legend__sw--neu" />Neutral (3)</span>
          <span className="stack-legend__item"><span className="stack-legend__sw stack-legend__sw--fav" />Favorable (4–5)</span>
        </div>
      </section>

      {/* === Favorabilidad por afirmación (comparativa) === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Favorabilidad por afirmación</h3>
            <p className="card__subtitle">Comparativa por sesión · % de respuestas favorables (4–5)</p>
          </div>
        </div>
        <div className="dims">
          {DIMS.map(dim => (
            <React.Fragment key={dim.id}>
              <div className="dim-group-label">{dim.label}</div>
              {dim.questions.map(qid => {
                const q = PULSO_QUESTIONS.find(q => q.id === qid)
                return (
                  <div className="comp-question" key={qid}>
                    <div className="comp-question__title" title={q.full}>{q.short}</div>
                    <div className="comp-question__rows">
                      {visibleSessions.map(({ session, qFav }) => (
                        <div className="comp-row" key={session.label}>
                          <span className="comp-row__label">{session.label}</span>
                          <div className="comp-row__bar">
                            <div className="comp-row__fill" style={{ width: `${qFav[qid]}%` }} />
                          </div>
                          <span className="comp-row__value">{qFav[qid].toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </section>
    </>
  )
}
