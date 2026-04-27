import React from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { PULSO_QUESTIONS, PULSO_DIMENSIONS } from '../lib/schema.js'
import { groupBySessions } from '../lib/csvParser.js'

const DIMS = [...PULSO_DIMENSIONS].sort((a, b) => a.id.localeCompare(b.id))
const ALL_IDS = PULSO_QUESTIONS.map(q => q.id)

// Calcula favorabilidad / neutralidad / desfavorabilidad para un conjunto de qids en una sesión
function computeFav(session, qids) {
  let fav = 0, neu = 0, dis = 0, total = 0
  for (const row of session.rows) {
    for (const qid of qids) {
      const v = row.responses[qid]
      if (v != null) {
        total++
        if (v >= 4) fav++
        else if (v === 3) neu++
        else dis++
      }
    }
  }
  const pct = n => total ? Math.round(n / total * 1000) / 10 : 0
  return { favorable: pct(fav), neutral: pct(neu), unfavorable: pct(dis), n: total }
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

function DimStackTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const dim = DIMS.find(d => d.id === label)
  return (
    <div className="tooltip">
      <div className="tooltip__title">{dim ? dim.label : label}</div>
      {[...payload].reverse().map(p => (
        <div className="tooltip__row" key={p.dataKey}>
          <span>{p.name}</span>
          <strong>{p.value.toFixed(1)}%</strong>
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

  const last   = perSession[perSession.length - 1]
  const prev   = perSession.length > 1 ? perSession[perSession.length - 2] : null
  const first  = perSession[0]

  const globalFav = last.fav.favorable
  const delta     = prev != null ? Math.round((globalFav - prev.fav.favorable) * 10) / 10 : null
  const variation = Math.round((globalFav - first.fav.favorable) * 10) / 10

  // Datos para el gráfico de línea
  const timelineData = perSession.map(({ session, fav }) => ({
    session: session.label,
    Favorabilidad: fav.favorable,
  }))

  // Datos para gráfico de distribución por dimensión (última sesión)
  const dimDistData = DIMS.map(dim => {
    const stats = computeFav(last.session, dim.questions)
    return {
      dim: dim.id,
      Favorable:     stats.favorable,
      Neutral:       stats.neutral,
      Desfavorable:  stats.unfavorable,
    }
  })

  return (
    <>
      {/* === KPIs === */}
      <div className="kpis">
        <div className="kpi kpi--primary">
          <div className="kpi__label">Favorabilidad global de coalición</div>
          <div className="kpi__value">
            {globalFav.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">
            {last.session.label} ({last.session.shortDate}) · n = {last.session.rows.length} resp.
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
          <div className="kpi__caption">{first.session.shortDate} → {last.session.shortDate}</div>
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* === Favorabilidad por afirmación + Distribución por dimensión === */}
      <div className="split">
        <section className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Favorabilidad por afirmación</h3>
              <p className="card__subtitle">
                Última sesión · % favorables (4–5) · marca rosa = sesión anterior
              </p>
            </div>
          </div>
          <div className="dims">
            {DIMS.map(dim => (
              <React.Fragment key={dim.id}>
                <div className="dim-group-label">{dim.label}</div>
                {dim.questions.map(qid => {
                  const q   = PULSO_QUESTIONS.find(q => q.id === qid)
                  const cur = last.qFav[qid]
                  const pr  = prev ? prev.qFav[qid] : null
                  const d   = pr != null ? Math.round((cur - pr) * 10) / 10 : null
                  const cls = d == null ? 'flat' : d > 0 ? 'up' : d < 0 ? 'down' : 'flat'
                  return (
                    <div className="dim" key={qid}>
                      <div className="dim__head">
                        <span className="dim__name" title={q.full}>{q.short}</span>
                        <span className="dim__value">
                          {cur.toFixed(1)}%
                          {d != null && (
                            <span className={`dim__delta ${cls}`}>
                              {d > 0 ? '▲' : d < 0 ? '▼' : '◆'} {d > 0 ? '+' : ''}{d.toFixed(1)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="dim__bar">
                        <div className="dim__bar-fill" style={{ width: `${cur}%` }} />
                        {pr != null && <div className="dim__bar-prev" style={{ left: `calc(${pr}% - 1px)` }} />}
                      </div>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Distribución por dimensión</h3>
              <p className="card__subtitle">Última sesión · favorabilidad, neutralidad y desfavorabilidad</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={dimDistData} margin={{ top: 8, right: 16, bottom: 8, left: -20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="dim"
                  axisLine={{ stroke: 'var(--border-strong)' }}
                  tickLine={false}
                  tick={{ fill: 'var(--text-soft)', fontSize: 13, fontFamily: 'Poppins', fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => v + '%'}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-mute)', fontSize: 11, fontFamily: 'Poppins' }}
                />
                <Tooltip content={<DimStackTooltip />} cursor={{ fill: 'rgba(34,34,34,0.04)' }} />
                <Bar dataKey="Desfavorable" stackId="s" fill="var(--magenta-2)" radius={0} />
                <Bar dataKey="Neutral"      stackId="s" fill="var(--gris-2)"    radius={0} />
                <Bar dataKey="Favorable"    stackId="s" fill="var(--turquesa)"  radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {[['Desfavorable', 'var(--magenta-2)'], ['Neutral', 'var(--gris-2)'], ['Favorable', 'var(--turquesa)']].map(([label, color]) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-soft)' }}>
                <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
                {label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
