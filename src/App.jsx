import React, { useState, useEffect, useCallback, useRef } from 'react'
import TopBar from './components/TopBar.jsx'
import ConfigPanel from './components/ConfigPanel.jsx'
import PulsoDashboard from './components/PulsoDashboard.jsx'
import AvanceDashboard from './components/AvanceDashboard.jsx'
import { fetchAndParseCsv, toCsvUrl } from './lib/csvParser.js'
import { MOCK_PULSO_ROWS, MOCK_AVANCE_ROWS } from './data/mockData.js'

const LS_KEY = 'adapsys-dashboard-config-v1'

function loadConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveConfig(cfg) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)) } catch {}
}

export default function App() {
  const params   = new URLSearchParams(window.location.search)
  const isAdmin  = params.has('admin')
  const saved    = loadConfig() || {}

  // Config — los parámetros de URL tienen prioridad sobre localStorage
  const [urlPulso,  setUrlPulso]  = useState(params.get('pulso')  || saved.urlPulso  || '')
  const [urlAvance, setUrlAvance] = useState(params.get('avance') || saved.urlAvance || '')
  const [companyName, setCompanyName] = useState(saved.companyName || '')
  const [logoUrl, setLogoUrl] = useState(saved.logoUrl || '')

  // Data
  const [pulsoRows,  setPulsoRows]  = useState(MOCK_PULSO_ROWS)
  const [avanceRows, setAvanceRows] = useState(MOCK_AVANCE_ROWS)
  const [isDemo, setIsDemo] = useState(true)

  // UI state
  const [tab, setTab] = useState('pulso')  // 'pulso' | 'avance'
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('')  // '' | 'ok' | 'error'
  const [lastUpdated, setLastUpdated] = useState(null)

  const connectRef = useRef(null)
  const isDemoRef  = useRef(isDemo)
  useEffect(() => { isDemoRef.current = isDemo }, [isDemo])

  // Persistir config
  useEffect(() => {
    saveConfig({ urlPulso, urlAvance, companyName, logoUrl })
  }, [urlPulso, urlAvance, companyName, logoUrl])

  // Conectar a los sheets
  const handleConnect = useCallback(async () => {
    if (!urlPulso && !urlAvance) {
      setStatus('Ingresá al menos una de las dos URLs.')
      setStatusType('error')
      return
    }
    setLoading(true)
    setStatus('Descargando datos de los Sheets…')
    setStatusType('')

    const results = { pulso: null, avance: null, errors: [] }

    if (urlPulso) {
      const csvUrl = toCsvUrl(urlPulso)
      if (!csvUrl) {
        results.errors.push('Pulso: URL no reconocida.')
      } else {
        try {
          const { rows, meta } = await fetchAndParseCsv(csvUrl, 'pulso')
          results.pulso = rows
          results.pulsoMeta = meta
        } catch (e) {
          results.errors.push(`Pulso: ${e.message}`)
        }
      }
    }

    if (urlAvance) {
      const csvUrl = toCsvUrl(urlAvance)
      if (!csvUrl) {
        results.errors.push('Avance: URL no reconocida.')
      } else {
        try {
          const { rows, meta } = await fetchAndParseCsv(csvUrl, 'avance')
          results.avance = rows
          results.avanceMeta = meta
        } catch (e) {
          results.errors.push(`Avance: ${e.message}`)
        }
      }
    }

    // Aplicar lo que haya venido
    let anyOk = false
    if (results.pulso) {
      setPulsoRows(results.pulso.length ? results.pulso : [])
      anyOk = true
    }
    if (results.avance) {
      setAvanceRows(results.avance.length ? results.avance : [])
      anyOk = true
    }

    if (anyOk) setIsDemo(false)

    const now = new Date()
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    if (results.errors.length > 0) {
      setStatus('Algunos Sheets no pudieron cargarse: ' + results.errors.join(' · '))
      setStatusType(anyOk ? '' : 'error')
    } else {
      const p = results.pulso?.length || 0
      const a = results.avance?.length || 0
      if (p === 0 && a === 0) {
        const pm = results.pulsoMeta
        const am = results.avanceMeta
        const diag = []
        if (pm) diag.push(`Pulso → encabezado fila ${pm.headerRowIdx}, preguntas: ${pm.questionsFound}/${pm.questionsTotal}, timestamp col ${pm.tsCol}: "${pm.firstTsValue}", primer valor de respuesta: "${pm.firstQValue}"`)
        if (am) diag.push(`Avance → encabezado fila ${am.headerRowIdx}, objetivos: ${am.questionsFound}/${am.questionsTotal}, timestamp col ${am.tsCol}: "${am.firstTsValue}", primer valor de respuesta: "${am.firstQValue}"`)
        setStatus('Conectado pero sin filas válidas. ' + diag.join(' | '))
        setStatusType('error')
      } else {
        setStatus(`Conectado. Pulso: ${p} respuestas · Avance: ${a} respuestas. Última actualización: ${timeStr}`)
        setStatusType('ok')
      }
    }

    if (anyOk) setLastUpdated(now)
    setLoading(false)
  }, [urlPulso, urlAvance])

  // Mantener ref actualizada para el intervalo
  useEffect(() => { connectRef.current = handleConnect }, [handleConnect])

  // Auto-refresh cada 60 s cuando hay datos en vivo
  useEffect(() => {
    const id = setInterval(() => {
      if (!isDemoRef.current) connectRef.current?.()
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  // Vista pública: carga automática al abrir si hay URLs guardadas
  useEffect(() => {
    if (!isAdmin && (urlPulso || urlAvance)) {
      handleConnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const handleReset = () => {
    setPulsoRows(MOCK_PULSO_ROWS)
    setAvanceRows(MOCK_AVANCE_ROWS)
    setIsDemo(true)
    setStatus('Volviste al modo demo con datos de ejemplo.')
    setStatusType('')
  }

  return (
    <main className="app">
      <TopBar
        companyName={companyName || (isDemo ? 'Cliente de ejemplo' : 'Cliente')}
        logoUrl={logoUrl}
        isDemo={isDemo}
      />

      {isAdmin && (
        <ConfigPanel
          urlPulso={urlPulso}
          urlAvance={urlAvance}
          companyName={companyName}
          logoUrl={logoUrl}
          onChangeUrlPulso={setUrlPulso}
          onChangeUrlAvance={setUrlAvance}
          onChangeCompany={setCompanyName}
          onChangeLogo={setLogoUrl}
          onConnect={handleConnect}
          onReset={handleReset}
          loading={loading}
          status={status}
          statusType={statusType}
        />
      )}

      <div className="tabs" role="tablist">
        <button
          className={`tab ${tab === 'pulso' ? 'active pulso' : ''}`}
          onClick={() => setTab('pulso')}
          role="tab" aria-selected={tab === 'pulso'}
        >
          Pulso de Coalición
        </button>
        <button
          className={`tab ${tab === 'avance' ? 'active avance' : ''}`}
          onClick={() => setTab('avance')}
          role="tab" aria-selected={tab === 'avance'}
        >
          Avance de Objetivos
        </button>
      </div>

      <div className="dash" key={tab}>
        {tab === 'pulso'
          ? <PulsoDashboard rows={pulsoRows} isDemo={isDemo} />
          : <AvanceDashboard rows={avanceRows} isDemo={isDemo} />
        }
      </div>

      <footer className="footer">
        <div className="footer__brand">
          <span className="dot-t" />
          <span className="dot-m" />
          Adapsys · Tablero de Cambio
        </div>
        <div>
          Construido con React, Vite y Recharts. Datos leídos directamente desde Google Sheets.
        </div>
      </footer>
    </main>
  )
}
