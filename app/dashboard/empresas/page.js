"use client";

import { useEffect, useState } from "react";

export default function Companies() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/companies");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as empresas.");
      setItems(data.companies || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!logo) { setPreview(""); return; }
    const url = URL.createObjectURL(logo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("nome", name.trim());
      if (logo) form.append("logo", logo);

      const response = await fetch("/api/companies", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível criar a empresa.");

      setName("");
      setLogo(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Organização · Espaços de trabalho</div>
          <h1>Empresas</h1>
          <p>Cria e gere os espaços de trabalho associados à tua conta.</p>
        </div>
      </div>

      {error && <div className="notice">{error}</div>}

      <div className="columns">
        <form className="panel" onSubmit={create}>
          <div className="eyebrow">Novo espaço</div>
          <h2>Criar empresa</h2>
          <p className="muted">Dá uma identidade ao espaço da tua equipa. O logótipo recebe um destaque visual no NÚCLEO.</p>

          <div className="field">
            <label>Nome da empresa</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Lotus" required />
          </div>

          <div className="field">
            <label>Logótipo (opcional)</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setLogo(e.target.files?.[0] || null)} />
            <small className="muted">PNG, JPG ou WebP · máximo 3 MB</small>
          </div>

          <div className="company-logo-preview">
            <div className="company-logo-orbit">
              {preview ? <img src={preview} alt="Pré-visualização do logótipo" /> : <span>{(name.trim()[0] || "N").toUpperCase()}</span>}
            </div>
            <div>
              <strong>{name.trim() || "A tua empresa"}</strong>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Pré-visualização da identidade</div>
            </div>
          </div>

          <button className="btn" disabled={busy}>{busy ? "A criar empresa…" : "Criar empresa"}</button>
        </form>

        <section className="panel">
          <div className="eyebrow">Os teus espaços</div>
          <h2>As minhas empresas</h2>
          <div className="company-list">
            {items.map(company => (
              <article className="company-card" key={company.id}>
                <div className="company-logo-orbit">
                  {company.logo ? <img src={company.logo} alt={`Logótipo ${company.nome}`} /> : <span>{(company.nome?.[0] || "N").toUpperCase()}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong>{company.nome}</strong>
                  <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>Espaço de trabalho · ID {company.id}</div>
                </div>
                <span className="pill blue" style={{ marginLeft: "auto" }}>Ativa</span>
              </article>
            ))}
          </div>
          {!items.length && <div className="empty">Ainda não tens empresas associadas.</div>}
        </section>
      </div>
    </>
  );
}
