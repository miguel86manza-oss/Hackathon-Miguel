import React from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine,
} from 'recharts'
import { PULSO_QUESTIONS, LIKERT_LABELS } from '../lib/schema.js'
import { groupBySessions, sessionAverages, distributionCounts } from '../lib/csvParser.js'

const LIKERT_COLORS = [
  'var(--likert-1)',
  'var(--likert-2)',
  'var(--likert-3)',
  'var(--likert-4)',
  'var(--likert-5)',
]

function AvgTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      <div className="tooltip__title">{label}</div>
      {payload.map((p) => (
        <div className="tooltip__row" key={p.dataKey}>
          <span>{p.name}</span>
          <strong className={p.dataKey === 'overall' ? 'tooltip__accent' : ''}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </strong>
        </div>
      ))}
    </div>
  )
}

function DimTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tooltip">
      <div className="tooltip__title">{LIKERT_LABELS[p.level]}</div>
      <div className="tooltip__row"><span>Respuestas</span><strong>{p.count}</strong></div>
      <div className="tooltip__row"><span>% del total</span><strong className="tooltip__accent">{p.pct}%</strong></div>
    </div>
  )
}

export default function PulsoDashboard({ rows, isDemo }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card empty">
        <strong>Sin datos del Pulso de Coalición.</strong><br/>
        Conectá el Sheet correspondiente desde la configuración para ver las métricas.
      </div>
    )
  }

  const sessions = groupBySessions(rows)
  if (sessions.length === 0) {
    return <div className="card empty"><strong>No se detectaron sesiones válidas.</strong> Verificá la columna de timestamp del Sheet.</div>
  }

  // Promedios por sesión
  const perSession = sessions.map(s => ({
    session: s,
    avg: sessionAverages(s, PULSO_QUESTIONS),
  }))
  const lastIdx = perSession.length - 1
  const last = perSession[lastIdx]
  const prev = lastIdx > 0 ? perSession[lastIdx - 1] : null
  const first = perSession[0]

  const delta = prev ? Math.round((last.avg.overall - prev.avg.overall) * 100) / 100 : null
  const totalShift = Math.round((last.avg.overall - first.avg.overall) * 100) / 100

  // Data para chart temporal: 1 punto por sesión, overall + línea por dimensión
  const timelineData = perSession.map(({ session, avg }) => {
    const row = { session: session.label, shortDate: session.shortDate, n: avg.n, overall: avg.overall }
    for (const q of PULSO_QUESTIONS) row[q.id] = avg[q.id]
    return row
  })

  // Distribución de la última sesión
  const dist = distributionCounts(last.session, PULSO_QUESTIONS, 5)
  const totalResp = Object.values(dist).reduce((a, b) => a + b, 0)
  const distData = [1, 2, 3, 4, 5].map((lvl) => ({
    level: lvl,
    label: `${lvl}`,
    count: dist[lvl],
    pct: totalResp ? Math.round((dist[lvl] / totalResp) * 1000) / 10 : 0,
    fill: LIKERT_COLORS[lvl - 1],
  }))

  // Ranking por dimensión de la última sesión
  const dimRanking = PULSO_QUESTIONS
    .map((q) => {
      const cur = last.avg[q.id]
      const pr = prev ? prev.avg[q.id] : null
      return { ...q, value: cur, prev: pr, delta: pr != null ? Math.round((cur - pr) * 100) / 100 : null }
    })
    .filter(d => d.value != null)
    .sort((a, b) => b.value - a.value)

  return (
    <>
      {/* === KPIs === */}
      <div className="kpis">
        <div className="kpi kpi--primary">
          <div className="kpi__label">Índice global de coalición</div>
          <div className="kpi__value">
            {last.avg.overall.toFixed(2)}<span className="unit">/ 5</span>
          </div>
          <div className="kpi__caption">
            Última sesión: {last.session.label} ({last.session.shortDate}) · n = {last.avg.n}
          </div>
          {delta != null && (
            <div className={`kpi__delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '◆'} {delta > 0 ? '+' : ''}{delta.toFixed(2)} vs sesión anterior
            </div>
          )}
        </div>

        <div className="kpi">
          <div className="kpi__label">Sesiones registradas</div>
          <div className="kpi__value">{sessions.length}</div>
          <div className="kpi__caption">
            {first.session.shortDate} → {last.session.shortDate}
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__label">Shift acumulado</div>
          <div className="kpi__value" style={{ color: totalShift >= 0 ? 'var(--turquesa-sec)' : 'var(--magenta-2)' }}>
            {totalShift >= 0 ? '+' : ''}{totalShift.toFixed(2)}
          </div>
          <div className="kpi__caption">
            Desde la primera sesión hasta hoy
          </div>
        </div>
      </div>

      {/* === Timeline general === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Evolución del índice entre sesiones</h3>
            <p className="card__subtitle">Promedio global del Pulso — una línea por sesión aplicada</p>
          </div>
          <span className="card__meta">{sessions.length} sesiones · escala 1–5</span>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={timelineData} margin={{ top: 8, right: 20, bottom: 8, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="session"
                axisLine={{ stroke: 'var(--border-strong)' }}
                tickLine={false}
                tick={{ fill: 'var(--text-soft)', fontSize: 12, fontFamily: 'Poppins' }}
                dy={6}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-mute)', fontSize: 11, fontFamily: 'Poppins' }}
              />
              <Tooltip content={<AvgTooltip />} cursor={{ stroke: 'var(--turquesa)', strokeDasharray: '3 3' }} />
              <ReferenceLine y={3} stroke="var(--gris-3)" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="overall"
                name="Índice global"
                stroke="var(--turquesa)"
                strokeWidth={3}
                dot={{ r: 5, fill: 'var(--white)', stroke: 'var(--turquesa)', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: 'var(--turquesa)', stroke: 'var(--white)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* === Split: ranking dimensiones + distribución === */}
      <div className="split">
        <section className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Ranking por dimensión</h3>
              <p className="card__subtitle">
                Promedio de la última sesión · marca rosa = sesión anterior
              </p>
            </div>
          </div>
          <div className="dims">
            {dimRanking.map((d) => {
              const pctWidth = ((d.value - 1) / 4) * 100  // 1..5 → 0..100
              const prevPct = d.prev != null ? ((d.prev - 1) / 4) * 100 : null
              const cls = d.delta == null ? 'flat' : d.delta > 0 ? 'up' : d.delta < 0 ? 'down' : 'flat'
              return (
                <div className="dim" key={d.id}>
                  <div className="dim__head">
                    <span className="dim__name" title={d.full}>{d.short}</span>
                    <span className="dim__value">
                      {d.value.toFixed(2)}
                      {d.delta != null && (
                        <span className={`dim__delta ${cls}`}>
                          {d.delta > 0 ? '▲' : d.delta < 0 ? '▼' : '◆'} {d.delta > 0 ? '+' : ''}{d.delta.toFixed(2)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="dim__bar">
                    <div className="dim__bar-fill" style={{ width: `${pctWidth}%` }} />
                    {prevPct != null && <div className="dim__bar-prev" style={{ left: `calc(${prevPct}% - 1px)` }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Distribución de respuestas</h3>
              <p className="card__subtitle">Última sesión · {totalResp} respuestas agregadas</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={distData} margin={{ top: 20, right: 8, bottom: 16, left: -20 }}>
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: 'var(--border-strong)' }}
                  tickLine={false}
                  tick={{ fill: 'var(--text-soft)', fontSize: 12, fontFamily: 'Poppins' }}
                  dy={4}
                />
                <YAxis hide />
                <Tooltip content={<DimTooltip />} cursor={{ fill: 'rgba(34,34,34,0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distData.map((entry) => (
                    <Cell key={entry.level} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--text-mute)', padding: '0 12px' }}>
            <span>Muy en desacuerdo</span>
            <span>Muy de acuerdo</span>
          </div>
        </section>
      </div>
    </>
  )
}
