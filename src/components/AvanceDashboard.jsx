import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { AVANCE_OBJETIVOS, AVANCE_LABELS } from '../lib/schema.js'
import { groupBySessions } from '../lib/csvParser.js'

// Distribución de respuestas (1,2,3) como % para un objetivo en una sesión
function computeDist(session, objId) {
  const counts = { 1: 0, 2: 0, 3: 0 }
  let total = 0
  for (const row of session.rows) {
    const v = row.responses[objId]
    if (v != null && counts[v] !== undefined) {
      counts[v]++
      total++
    }
  }
  const pct = n => total ? Math.round(n / total * 1000) / 10 : 0
  return { 1: pct(counts[1]), 2: pct(counts[2]), 3: pct(counts[3]), n: total }
}

// % de nivel 3 (Realizado) en todos los objetivos de una sesión
function pctRealizado(session) {
  let done = 0, total = 0
  for (const row of session.rows) {
    for (const obj of AVANCE_OBJETIVOS) {
      const v = row.responses[obj.id]
      if (v != null) { total++; if (v === 3) done++ }
    }
  }
  return total ? Math.round(done / total * 1000) / 10 : 0
}

function StackTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const obj = AVANCE_OBJETIVOS.find(o => o.short === label)
  return (
    <div className="tooltip">
      <div className="tooltip__title">{obj ? obj.full : label}</div>
      {[...payload].reverse().map(p => (
        <div className="tooltip__row" key={p.name}>
          <span>{p.name.replace(/_\d$/, ' · ').replace('_1', AVANCE_LABELS[1]).replace('_2', AVANCE_LABELS[2]).replace('_3', AVANCE_LABELS[3])}</span>
          <strong>{p.value.toFixed(1)}%</strong>
        </div>
      ))}
    </div>
  )
}

export default function AvanceDashboard({ rows, isDemo }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card empty">
        <strong>Sin datos de Avance de Objetivos.</strong><br />
        Conectá el Sheet correspondiente desde la configuración para ver las métricas.
      </div>
    )
  }

  const sessions = groupBySessions(rows)
  if (sessions.length === 0) {
    return <div className="card empty"><strong>No se detectaron sesiones válidas.</strong> Verificá la columna de timestamp del Sheet.</div>
  }

  // Distribuciones por sesión y objetivo
  const perSession = sessions.map(s => ({
    session: s,
    pctReal: pctRealizado(s),
    dist: Object.fromEntries(AVANCE_OBJETIVOS.map(obj => [obj.id, computeDist(s, obj.id)])),
  }))

  const last  = perSession[perSession.length - 1]
  const prev  = perSession.length > 1 ? perSession[perSession.length - 2] : null
  const first = perSession[0]

  const delta     = prev != null ? Math.round((last.pctReal - prev.pctReal) * 10) / 10 : null
  const variation = Math.round((last.pctReal - first.pctReal) * 10) / 10

  // Datos para barras apiladas: X = objetivos, barras por sesión (stacked por nivel)
  const chartData = AVANCE_OBJETIVOS.map(obj => {
    const row = { objetivo: obj.short }
    perSession.forEach(({ session, dist }) => {
      const sid = session.label
      row[`${sid}_1`] = dist[obj.id][1]
      row[`${sid}_2`] = dist[obj.id][2]
      row[`${sid}_3`] = dist[obj.id][3]
    })
    return row
  })

  // Colores por sesión (degradé magenta → turquesa)
  const SESSION_COLORS = ['var(--magenta-2)', 'var(--magenta-1)', 'var(--turquesa-sec)', 'var(--turquesa)']
  const LEVEL_ALPHA = [0.45, 0.72, 1]   // opacidad relativa para los 3 niveles dentro de una sesión

  return (
    <>
      {/* === KPIs === */}
      <div className="kpis">
        <div className="kpi kpi--primary">
          <div className="kpi__label">Avance consolidado (% Realizados)</div>
          <div className="kpi__value">
            {last.pctReal.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">
            {last.session.label} ({last.session.shortDate}) · n = {last.session.rows.length} resp.
          </div>
          {delta != null && (
            <div className={`kpi__delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '◆'} {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs anterior
            </div>
          )}
        </div>

        <div className="kpi">
          <div className="kpi__label">Objetivos trackeados</div>
          <div className="kpi__value">{AVANCE_OBJETIVOS.length}</div>
          <div className="kpi__caption">Propósito · Gran Oportunidad · Visión</div>
        </div>

        <div className="kpi">
          <div className="kpi__label">Variación total</div>
          <div className="kpi__value" style={{ color: variation >= 0 ? 'var(--turquesa-sec)' : 'var(--magenta-2)' }}>
            {variation >= 0 ? '+' : ''}{variation.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">Desde primera sesión ({first.session.shortDate})</div>
        </div>
      </div>

      {/* === Barras apiladas: distribución por objetivo entre sesiones === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Progreso por objetivo entre sesiones</h3>
            <p className="card__subtitle">Distribución de respuestas por nivel · % de participantes</p>
          </div>
          <span className="card__meta">escala 1–3 · {sessions.length} sesiones</span>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 16, right: 20, bottom: 8, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="objetivo"
                axisLine={{ stroke: 'var(--border-strong)' }}
                tickLine={false}
                tick={{ fill: 'var(--text-soft)', fontSize: 12, fontFamily: 'Poppins' }}
                dy={6}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={v => v + '%'}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-mute)', fontSize: 11, fontFamily: 'Poppins' }}
              />
              <Tooltip content={<StackTooltip />} cursor={{ fill: 'rgba(34,34,34,0.04)' }} />
              {perSession.map(({ session }, idx) => {
                const sid   = session.label
                const color = SESSION_COLORS[Math.min(idx, SESSION_COLORS.length - 1)]
                return [
                  <Bar key={`${sid}_1`} dataKey={`${sid}_1`} stackId={sid} name={`${sid} · ${AVANCE_LABELS[1]}`}
                    fill={color} opacity={LEVEL_ALPHA[0]} radius={0} maxBarSize={52} />,
                  <Bar key={`${sid}_2`} dataKey={`${sid}_2`} stackId={sid} name={`${sid} · ${AVANCE_LABELS[2]}`}
                    fill={color} opacity={LEVEL_ALPHA[1]} radius={0} maxBarSize={52} />,
                  <Bar key={`${sid}_3`} dataKey={`${sid}_3`} stackId={sid} name={`${sid} · ${AVANCE_LABELS[3]}`}
                    fill={color} opacity={LEVEL_ALPHA[2]} radius={[6, 6, 0, 0]} maxBarSize={52} />,
                ]
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Leyenda de sesiones */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {perSession.map(({ session }, idx) => {
            const color = SESSION_COLORS[Math.min(idx, SESSION_COLORS.length - 1)]
            return (
              <span key={session.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-soft)' }}>
                <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
                {session.label} · {session.shortDate}
              </span>
            )
          })}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-mute)', marginLeft: 8 }}>
            Intensidad: pálido = No realizado · medio = En proceso · pleno = Realizado
          </span>
        </div>
      </section>

      {/* === Estado actual por objetivo (tabla) === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Estado actual por objetivo</h3>
            <p className="card__subtitle">Última sesión · % de participantes por nivel de avance</p>
          </div>
        </div>
        <div className="avance-table">
          <div className="avance-table__head">
            <span>Objetivo</span>
            <span>No realizado</span>
            <span>En proceso</span>
            <span>Realizado</span>
          </div>
          {AVANCE_OBJETIVOS.map(obj => {
            const d = last.dist[obj.id]
            return (
              <div className="avance-table__row" key={obj.id}>
                <span className="avance-table__label" title={obj.full}>{obj.short}</span>
                <span className="avance-table__cell avance-table__cell--1">{d[1].toFixed(0)}%</span>
                <span className="avance-table__cell avance-table__cell--2">{d[2].toFixed(0)}%</span>
                <span className="avance-table__cell avance-table__cell--3">{d[3].toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
