import React, { useState } from 'react'
import { AVANCE_OBJETIVOS, AVANCE_LABELS } from '../lib/schema.js'
import { groupBySessions } from '../lib/csvParser.js'

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

  const perSession = sessions.map(s => ({
    session: s,
    pctReal: pctRealizado(s),
    dist: Object.fromEntries(AVANCE_OBJETIVOS.map(obj => [obj.id, computeDist(s, obj.id)])),
  }))

  const lastIdx = perSession.length - 1

  // 'all' muestra todas las sesiones; número = índice de sesión seleccionada
  const [filterIdx, setFilterIdx] = useState('all')

  const isAll = filterIdx === 'all'
  const safeIdx = isAll ? lastIdx : Math.min(filterIdx, lastIdx)

  // Para KPIs usamos la sesión focal (seleccionada o última)
  const focused = perSession[safeIdx]
  const prevFocused = safeIdx > 0 ? perSession[safeIdx - 1] : null
  const first = perSession[0]

  const delta = prevFocused ? Math.round((focused.pctReal - prevFocused.pctReal) * 10) / 10 : null
  const variation = Math.round((focused.pctReal - first.pctReal) * 10) / 10

  // Sesiones visibles en las secciones comparativas
  const visibleSessions = isAll ? perSession : [perSession[safeIdx]]

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
          <div className="kpi__label">Avance consolidado (% Realizados)</div>
          <div className="kpi__value">
            {focused.pctReal.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="kpi__caption">
            {focused.session.label} ({focused.session.shortDate}) · n = {focused.session.rows.length} resp.
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

      {/* === Progreso por objetivo entre sesiones (barras apiladas horizontales) === */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Progreso por objetivo entre sesiones</h3>
            <p className="card__subtitle">Distribución de respuestas por nivel · % de participantes</p>
          </div>
          <span className="card__meta">escala 1–3 · {visibleSessions.length} sesión{visibleSessions.length !== 1 ? 'es' : ''}</span>
        </div>

        <div className="dim-stacks">
          {AVANCE_OBJETIVOS.map(obj => (
            <div className="dim-stack-block" key={obj.id}>
              <div className="dim-stack-block__label">{obj.short}</div>
              <div className="dim-stack-block__sublabel">{obj.full}</div>
              {visibleSessions.map(({ session, dist }) => {
                const d = dist[obj.id]
                return (
                  <div className="stack-row" key={session.label}>
                    <span className="stack-row__label">{session.label}</span>
                    <div className="stack-row__bar">
                      {d[3] > 0 && (
                        <div className="stack-row__seg stack-row__seg--av3" style={{ width: `${d[3]}%` }}>
                          {d[3] >= 8 ? `${d[3].toFixed(0)}%` : ''}
                        </div>
                      )}
                      {d[2] > 0 && (
                        <div className="stack-row__seg stack-row__seg--av2" style={{ width: `${d[2]}%` }}>
                          {d[2] >= 8 ? `${d[2].toFixed(0)}%` : ''}
                        </div>
                      )}
                      {d[1] > 0 && (
                        <div className="stack-row__seg stack-row__seg--av1" style={{ width: `${d[1]}%` }}>
                          {d[1] >= 8 ? `${d[1].toFixed(0)}%` : ''}
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
          <span className="stack-legend__item"><span className="stack-legend__sw stack-legend__sw--av1" />{AVANCE_LABELS[1]}</span>
          <span className="stack-legend__item"><span className="stack-legend__sw stack-legend__sw--av2" />{AVANCE_LABELS[2]}</span>
          <span className="stack-legend__item"><span className="stack-legend__sw stack-legend__sw--av3" />{AVANCE_LABELS[3]}</span>
        </div>
      </section>

    </>
  )
}
