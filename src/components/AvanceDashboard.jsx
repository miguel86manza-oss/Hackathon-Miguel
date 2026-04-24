import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { AVANCE_OBJETIVOS, AVANCE_LABELS } from '../lib/schema.js'
import { groupBySessions, sessionAverages } from '../lib/csvParser.js'

const AVANCE_COLORS = {
  1: 'var(--avance-1)',
  2: 'var(--avance-2)',
  3: 'var(--avance-3)',
}

function AvanceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      <div className="tooltip__title">{label}</div>
      {payload.map((p) => (
        <div className="tooltip__row" key={p.dataKey}>
          <span>{p.name}</span>
          <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong>
        </div>
      ))}
      <div className="tooltip__row" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <span>Escala</span>
        <strong className="tooltip__accent">1 → 3</strong>
      </div>
    </div>
  )
}

// Mapea un valor 1..3 al estado semántico más cercano
function statusFromValue(v) {
  if (v == null) return { label: '—', cls: 's1' }
  const rounded = Math.round(v)
  if (rounded <= 1) return { label: AVANCE_LABELS[1], cls: 's1' }
  if (rounded === 2) return { label: AVANCE_LABELS[2], cls: 's2' }
  return { label: AVANCE_LABELS[3], cls: 's3' }
}

export default function AvanceDashboard({ rows, isDemo }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card empty">
        <strong>Sin datos de Avance de Objetivos.</strong><br/>
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
    avg: sessionAverages(s, AVANCE_OBJETIVOS),
  }))
  const lastIdx = perSession.length - 1
  const last = perSession[lastIdx]
  const prev = lastIdx > 0 ? perSession[lastIdx - 1] : null
  const first = perSession[0]

  const delta = prev ? Math.round((last.avg.overall - prev.avg.overall) * 100) / 100 : null
  const totalShift = Math.round((last.avg.overall - first.avg.overall) * 100) / 100

  // Porcentaje de avance total (escala 1..3 → 0..100%)
  const pctLast = Math.round(((last.avg.overall - 1) / 2) * 100)

  // Chart: barras agrupadas — una barra por objetivo por sesión
  const chartData = AVANCE_OBJETIVOS.map((obj) => {
    const row = { objetivo: obj.short }
    perSession.forEach(({ session, avg }) => {
      row[session.label] = avg[obj.id]
    })
    return row
  })

  return (
    <>
      {/* === KPIs === */}
      <div className="kpis">
        <div className="kpi kpi--primary">
          <div className="kpi__label">Avance consolidado</div>
          <div className="kpi__value">
            {pctLast}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">
            Promedio {last.avg.overall.toFixed(2)} / 3 · {last.session.label} ({last.session.shortDate}) · n = {last.avg.n}
          </div>
          {delta != null && (
            <div className={`kpi__delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '◆'} {delta > 0 ? '+' : ''}{delta.toFixed(2)} vs anterior
            </div>
          )}
        </div>

        <div className="kpi">
          <div className="kpi__label">Objetivos trackeados</div>
          <div className="kpi__value">{AVANCE_OBJETIVOS.length}</div>
          <div className="kpi__caption">
            Propósito · Gran Oportunidad · Visión
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__label">Movimiento total</div>
          <div className="kpi__value" style={{ color: totalShift >= 0 ? 'var(--turquesa-sec)' : 'var(--magenta-2)' }}>
            {totalShift >= 0 ? '+' : ''}{totalShift.toFixed(2)}
          </div>
          <div className="kpi__caption">
            Desde primera sesión ({first.session.shortDate})
          </div>
        </div>
      </div>

      {/* === Barras agrupadas por objetivo × sesión === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Progreso por objetivo entre sesiones</h3>
            <p className="card__subtitle">Comparación directa de cada objetivo a lo largo de las sesiones</p>
          </div>
          <span className="card__meta">escala 1–3 · {sessions.length} sesiones</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 8, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="objetivo"
                axisLine={{ stroke: 'var(--border-strong)' }}
                tickLine={false}
                tick={{ fill: 'var(--text-soft)', fontSize: 12, fontFamily: 'Poppins' }}
                dy={6}
              />
              <YAxis
                domain={[0, 3]}
                ticks={[1, 2, 3]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-mute)', fontSize: 11, fontFamily: 'Poppins' }}
              />
              <Tooltip content={<AvanceTooltip />} cursor={{ fill: 'rgba(34,34,34,0.04)' }} />
              {perSession.map(({ session }, idx) => {
                // Gradiente de colores de la paleta: primera sesión en magenta → última en turquesa
                const colors = [
                  'var(--magenta-2)',
                  'var(--magenta-1)',
                  'var(--turquesa-sec)',
                  'var(--turquesa)',
                ]
                // Si hay más de 4 sesiones, ciclamos
                const color = colors[Math.min(idx, colors.length - 1)]
                return (
                  <Bar
                    key={session.label}
                    dataKey={session.label}
                    fill={color}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={52}
                  />
                )
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Mini-leyenda custom */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {perSession.map(({ session }, idx) => {
            const colors = ['var(--magenta-2)', 'var(--magenta-1)', 'var(--turquesa-sec)', 'var(--turquesa)']
            const color = colors[Math.min(idx, colors.length - 1)]
            return (
              <span key={session.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-soft)' }}>
                <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
                {session.label} · {session.shortDate}
              </span>
            )
          })}
        </div>
      </section>

      {/* === Estado actual por objetivo === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Estado actual por objetivo</h3>
            <p className="card__subtitle">Última sesión aplicada · con cambio vs sesión anterior</p>
          </div>
        </div>
        <div className="dims">
          {AVANCE_OBJETIVOS.map((obj) => {
            const cur = last.avg[obj.id]
            const pr = prev ? prev.avg[obj.id] : null
            const d = pr != null ? Math.round((cur - pr) * 100) / 100 : null
            const pctWidth = cur != null ? ((cur - 1) / 2) * 100 : 0
            const prevPct = pr != null ? ((pr - 1) / 2) * 100 : null
            const status = statusFromValue(cur)
            const cls = d == null ? 'flat' : d > 0 ? 'up' : d < 0 ? 'down' : 'flat'
            return (
              <div className="dim" key={obj.id}>
                <div className="dim__head">
                  <span className="dim__name">
                    {obj.short}
                    <span className={`avance-chip ${status.cls}`} style={{ marginLeft: 10 }}>
                      {status.label}
                    </span>
                  </span>
                  <span className="dim__value">
                    {cur != null ? cur.toFixed(2) : '—'}
                    {d != null && (
                      <span className={`dim__delta ${cls}`}>
                        {d > 0 ? '▲' : d < 0 ? '▼' : '◆'} {d > 0 ? '+' : ''}{d.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="dim__bar">
                  <div
                    className="dim__bar-fill"
                    style={{
                      width: `${pctWidth}%`,
                      background: cur != null && cur >= 2.5
                        ? 'linear-gradient(90deg, var(--turquesa-sec), var(--turquesa))'
                        : cur != null && cur >= 1.67
                          ? 'linear-gradient(90deg, var(--turquesa-sec), var(--turquesa-sec))'
                          : 'linear-gradient(90deg, var(--magenta-2), var(--magenta-1))',
                    }}
                  />
                  {prevPct != null && <div className="dim__bar-prev" style={{ left: `calc(${prevPct}% - 1px)` }} />}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
