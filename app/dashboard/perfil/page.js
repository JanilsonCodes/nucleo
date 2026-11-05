"use client";

import { useEffect, useState } from "react";

const PRESETS = [
  { id: "obsidian", name: "Obsidiana", mode: "dark", primary: "#E9EFA6", secondary: "#D7D5FF", background: "#111111" },
  { id: "ocean", name: "Oceano", mode: "dark", primary: "#A9C7FF", secondary: "#A8E6D5", background: "#101722" },
  { id: "orchid", name: "Orquídea", mode: "dark", primary: "#E8B7FF", secondary: "#F4D3C4", background: "#19121D" },
  { id: "sand", name: "Areia", mode: "light", primary: "#A96F43", secondary: "#D6B98C", background: "#F5F1E8" },
];
const DEFAULT = PRESETS[0];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
    try {
      const stored = JSON.parse(localStorage.getItem("nucleo-theme-config") || "null");
      if (stored) setTheme({ ...DEFAULT, ...stored, id: stored.id || "custom" });
    } catch {}
  }, []);

  function update(field, value) {
    const next = { ...theme, id: "custom", [field]: value };
    setTheme(next);
    localStorage.setItem("nucleo-theme-config", JSON.stringify(next));
    window.dispatchEvent(new Event("nucleo-theme-change"));
    setSaved(true);
  }

  function apply(nextTheme) {
    setTheme(nextTheme);
    localStorage.setItem("nucleo-theme-config", JSON.stringify(nextTheme));
    window.dispatchEvent(new Event("nucleo-theme-change"));
    setSaved(true);
  }

  function saveCustom() {
    apply({ ...theme, id: "custom" });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Conta · Personalização</div>
          <h1>Perfil e aparência</h1>
          <p>Gere os teus dados e escolhe a identidade visual do teu NÚCLEO.</p>
        </div>
      </div>

      <section className="panel">
        <div className="eyebrow">Dados pessoais</div>
        <h2>O teu perfil</h2>
        {user ? <>
          <p><b>Nome:</b> {user.full_name}</p>
          <p><b>Utilizador:</b> {user.username}</p>
          <p><b>Tipo de conta:</b> {user.role}</p>
          <p><b>Conta criada:</b> {user.created_at ? new Date(user.created_at).toLocaleDateString("pt-PT") : "—"}</p>
        </> : <p className="muted">A carregar informações da conta…</p>}
      </section>

      <section className="panel theme-section">
        <div className="appearance-top">
          <div>
            <div className="eyebrow">A tua experiência</div>
            <h2>Paleta de cores</h2>
            <p className="muted">Escolhe uma combinação ou cria uma identidade visual própria. A preferência fica guardada neste dispositivo.</p>
          </div>
          <span className="pill blue">Personalizável</span>
        </div>

        <div className="theme-grid">
          {PRESETS.map(preset => (
            <button type="button" key={preset.id} className={`theme-option ${theme.id === preset.id ? "selected" : ""}`} onClick={() => apply(preset)}>
              <span className="theme-swatch"><i style={{ background: preset.background }} /><i style={{ background: preset.primary }} /><i style={{ background: preset.secondary }} /></span>
              <strong>{preset.name}</strong>
              <small className="muted">{preset.mode === "dark" ? "Modo escuro" : "Modo claro"}</small>
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 24 }}>
          <label>Cria a tua própria paleta</label>
          <div className="palette-fields">
            <label className="color-field">Cor principal<input type="color" value={theme.primary} onChange={e => update("primary", e.target.value)} /></label>
            <label className="color-field">Cor secundária<input type="color" value={theme.secondary} onChange={e => update("secondary", e.target.value)} /></label>
            <label className="color-field">Cor de fundo<input type="color" value={theme.background} onChange={e => update("background", e.target.value)} /></label>
          </div>
        </div>

        <div className="field" style={{ maxWidth: 260 }}>
          <label>Modo de apresentação</label>
          <select value={theme.mode} onChange={e => update("mode", e.target.value)}>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
          </select>
        </div>

        <div className="company-logo-preview" style={{ background: `linear-gradient(120deg, ${theme.primary}33, ${theme.secondary}33)` }}>
          <img src="/nucleo-mark.svg" alt="Símbolo NUCLEO" style={{ width: 54, height: 54, borderRadius: 16, background: "#171717", padding: 5 }} />
          <div><strong>Pré-visualização da tua paleta</strong><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>As cores serão aplicadas aos botões, destaques e elementos de navegação.</div></div>
        </div>

        <button type="button" className="btn" onClick={saveCustom}>Guardar a minha paleta</button>
        {saved && <span className="toast" style={{ display: "inline-block", marginLeft: 12 }}>Paleta guardada com sucesso.</span>}
      </section>
    </>
  );
}
