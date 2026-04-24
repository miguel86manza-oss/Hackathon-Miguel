import React from 'react'

export default function TopBar({ companyName, logoUrl, isDemo, onToggleConfig }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__logo">
          {logoUrl
            ? <img src={logoUrl} alt={companyName || 'Logo'} onError={(e) => { e.currentTarget.style.display = 'none' }} />
            : <span className="topbar__logo-placeholder">{(companyName || 'A').slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div className="topbar__title">
          <div className="topbar__brand">Adapsys · Tablero de Cambio</div>
          <div className="topbar__main">{companyName || 'Cliente sin configurar'}</div>
          <div className="topbar__meta">Pulso de Coalición y Avance de Objetivos</div>
        </div>
      </div>
      <div className="topbar__actions">
        {isDemo && <span className="pill-demo">Modo demo</span>}
      </div>
    </header>
  )
}
