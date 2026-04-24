import React, { useRef, useState } from 'react'
import { toCsvUrl } from '../lib/csvParser.js'

export default function ConfigPanel({
  urlPulso, urlAvance, tabPulso, tabAvance, companyName, logoUrl,
  onChangeUrlPulso, onChangeUrlAvance, onChangeTabPulso, onChangeTabAvance,
  onChangeCompany, onChangeLogo,
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
            <strong>Cómo conectar tu Google Sheet:</strong> abrí la hoja → <code>Compartir</code> → <code>Cualquier persona con el enlace</code> → rol <code>Lector</code>. Luego copiá la URL de la barra del navegador y pegala abajo. No hace falta publicar como CSV.
          </div>

          <div className="config__grid">
            <div className="field">
              <label className="field__label">
                <span className="accent">●</span> Sheet · Pulso de Coalición
              </label>
              <input
                type="url"
                className="field__input"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0#gid=0"
                value={urlPulso}
                onChange={(e) => onChangeUrlPulso(e.target.value)}
              />
              <input
                type="text"
                className="field__input"
                style={{ marginTop: 6 }}
                placeholder="Nombre exacto de la pestaña (ej: Pulso coalición Cosude 24-04-26_RawData)"
                value={tabPulso}
                onChange={(e) => onChangeTabPulso(e.target.value)}
              />
              <span className="field__hint">
                Recopilador de Pulso (10 afirmaciones, escala 1–5). El nombre de pestaña debe coincidir exactamente con el de la hoja.
              </span>
            </div>

            <div className="field">
              <label className="field__label">
                <span className="accent-m">●</span> Sheet · Avance de Objetivos
              </label>
              <input
                type="url"
                className="field__input"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0#gid=0"
                value={urlAvance}
                onChange={(e) => onChangeUrlAvance(e.target.value)}
              />
              <input
                type="text"
                className="field__input"
                style={{ marginTop: 6 }}
                placeholder="Nombre exacto de la pestaña (ej: Pulso registro de avance de objetivos Cosude 24-04-26_RawData)"
                value={tabAvance}
                onChange={(e) => onChangeTabAvance(e.target.value)}
              />
              <span className="field__hint">
                Recopilador de Avance (3 objetivos, escala 1–3). El nombre de pestaña debe coincidir exactamente con el de la hoja.
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
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-mute)' }}>
              {urlPulso && (
                <div>URL Pulso que se usará: <code style={{ fontSize: 10 }}>{toCsvUrl(urlPulso, tabPulso) || '— URL no reconocida, pegá la URL completa de Google Sheets —'}</code></div>
              )}
              {urlAvance && (
                <div>URL Avance que se usará: <code style={{ fontSize: 10 }}>{toCsvUrl(urlAvance, tabAvance) || '— URL no reconocida, pegá la URL completa de Google Sheets —'}</code></div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
