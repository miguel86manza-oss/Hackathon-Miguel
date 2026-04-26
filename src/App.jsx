import React, { useState, useEffect, useCallback } from 'react'
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
  const saved = loadConfig() || {}

  // Config
  const [urlPulso,  setUrlPulso]  = useState(saved.urlPulso  || '')
  const [urlAvance, setUrlAvance] = useState(saved.urlAvance || '')
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
          const { rows } = await fetchAndParseCsv(csvUrl, 'pulso')
          results.pulso = rows
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
          const { rows } = await fetchAndParseCsv(csvUrl, 'avance')
          results.avance = rows
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

    if (results.errors.length > 0) {
      setStatus('Algunos Sheets no pudieron cargarse: ' + results.errors.join(' · '))
      setStatusType(anyOk ? '' : 'error')
    } else {
      const p = results.pulso?.length || 0
      const a = results.avance?.length || 0
      setStatus(`Conectado. Pulso: ${p} respuestas · Avance: ${a} respuestas.`)
      setStatusType('ok')
    }

    setLoading(false)
  }, [urlPulso, urlAvance])

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
