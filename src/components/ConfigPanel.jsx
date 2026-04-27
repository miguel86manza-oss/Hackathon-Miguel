import React, { useRef, useState } from 'react'
import { toCsvUrl } from '../lib/csvParser.js'

function buildConsultorUrl(urlPulso, urlAvance, companyName, logoUrl) {
  const base = `${window.location.origin}${window.location.pathname}`
  const p = new URLSearchParams()
  if (urlPulso)    p.set('pulso',   urlPulso)
  if (urlAvance)   p.set('avance',  urlAvance)
  if (companyName) p.set('company', companyName)
  // Logo base64 no va en URL — solo URLs públicas (http/https)
  if (logoUrl && logoUrl.startsWith('http')) p.set('logo', logoUrl)
  return `${base}?${p.toString()}`
}

function ShareLink({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="share-link">
      <span className="share-link__label">Link del consultor</span>
      <code className="share-link__url">{url}</code>
      <button className="btn btn--ghost btn--sm" onClick={copy}>
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

export default function ConfigPanel({
  urlPulso, urlAvance, companyName, logoUrl,
  onChangeUrlPulso, onChangeUrlAvance, onChangeCompany, onChangeLogo,
  onConnect, onReset,
  loading, status, statusType,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('La imagen supera 500 KB. Usá una más liviana o pegá una URL pública.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChangeLogo(reader.result)  // data URL
    reader.readAsDataURL(file)
  }

  return (
    <section className="config">
      <div className="config__header">
        <div>
          <h2 className="config__title">Configuración del tablero</h2>
          <p className="config__subtitle">
            Conectá los dos recopiladores publicados como CSV y personalizá la identidad del cliente.
          </p>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-soft)' }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="banner">
            <strong>Cómo publicar tu Google Sheet:</strong> desde la hoja → <code>Archivo</code> → <code>Compartir</code> → <code>Publicar en la web</code> → elegir la pestaña correcta → formato <code>CSV</code> → <code>Publicar</code>. Copiá la URL resultante y pegala abajo. También podés pegar la URL normal de edición; el dashboard la intenta convertir (si no, publicala como CSV).
          </div>

          <div className="config__grid">
            <div className="field">
              <label className="field__label">
                <span className="accent">●</span> Sheet · Pulso de Coalición
              </label>
              <input
                type="url"
                className="field__input"
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                value={urlPulso}
                onChange={(e) => onChangeUrlPulso(e.target.value)}
              />
              <span className="field__hint">
                Recopilador de Pulso (10 afirmaciones, escala 1–5).
              </span>
            </div>

            <div className="field">
              <label className="field__label">
                <span className="accent-m">●</span> Sheet · Avance de Objetivos
              </label>
              <input
                type="url"
                className="field__input"
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                value={urlAvance}
                onChange={(e) => onChangeUrlAvance(e.target.value)}
              />
              <span className="field__hint">
                Recopilador de Avance (3 objetivos, escala 1–3).
              </span>
            </div>

            <div className="field">
              <label className="field__label">Nombre del cliente / empresa</label>
              <input
                type="text"
                className="field__input"
                placeholder="Ej: Coalición Cosude 2026"
                value={companyName}
                onChange={(e) => onChangeCompany(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field__label">Logo del cliente</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="url"
                  className="field__input"
                  placeholder="URL pública de imagen…  o subí un archivo →"
                  value={logoUrl && logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => onChangeLogo(e.target.value)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-soft)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Subir
                </button>
              </div>
              <span className="field__hint">
                PNG/SVG con fondo transparente idealmente. Se guarda local en el navegador (&lt; 500 KB).
              </span>
            </div>
          </div>

          <div className="config__actions">
            <div className={`config__status ${statusType || ''}`}>
              {status || 'Completá las URLs y tocá "Conectar" para cargar los datos.'}
            </div>
            {(urlPulso || urlAvance) && (
              <button className="btn btn--ghost" onClick={onReset} disabled={loading}>
                Volver a demo
              </button>
            )}
            <button className="btn btn--primary" onClick={onConnect} disabled={loading}>
              {loading ? 'Conectando…' : 'Conectar y cargar'}
            </button>
          </div>

          {(urlPulso || urlAvance) && (
            <ShareLink url={buildConsultorUrl(urlPulso, urlAvance, companyName, logoUrl)} />
          )}
        </>
      )}
    </section>
  )
}
