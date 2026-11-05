"use client";
import { useCallback, useEffect, useState } from "react";

export default function Admissions() {
  const [rows, setRows] = useState([]);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async (id) => {
    if (!id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/memberships?empresa_id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os pedidos.");
      setRows(Array.isArray(data.members) ? data.members : []);
    } catch (err) {
      setRows([]);
      setError(err.message || "Erro ao carregar os pedidos de admissão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      let id = localStorage.getItem("nucleo_company") || "";
      if (!id) {
        try {
          const response = await fetch("/api/auth/session", { cache: "no-store" });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Não foi possível identificar a empresa.");
          id = String(data.companies?.[0]?.id || "");
          if (id) localStorage.setItem("nucleo_company", id);
        } catch (err) {
          if (active) {
            setError(err.message || "Não foi possível identificar a empresa.");
            setLoading(false);
          }
          return;
        }
      }
      if (active) {
        setCompany(id);
        await load(id);
      }
    }

    function onCompanyChange(event) {
      const id = String(event?.detail || localStorage.getItem("nucleo_company") || "");
      setCompany(id);
      load(id);
    }

    initialize();
    window.addEventListener("nucleo-company-change", onCompanyChange);
    return () => {
      active = false;
      window.removeEventListener("nucleo-company-change", onCompanyChange);
    };
  }, [load]);

  async function decide(id, estado) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o pedido.");
      await load(company);
    } catch (err) {
      setError(err.message || "Erro ao atualizar o pedido.");
    } finally {
      setBusy(null);
    }
  }

  const pending = rows.filter((item) => item.estado === "pendente").length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Gestão de acessos</div>
          <h1>Admissões</h1>
          <p>Aprova ou rejeita pedidos de entrada na empresa.</p>
        </div>
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="empty">A carregar pedidos de admissão…</div>
        ) : rows.length ? (
          <>
            <div className="panel-head">
              <strong>Pedidos de funcionários</strong>
              <span className="pill">{pending} pendente{pending === 1 ? "" : "s"}</span>
            </div>
            {rows.map((membership) => (
              <div className="list-item" key={membership.id}>
                <div>
                  <strong>{membership.conta?.full_name || "Funcionário"}</strong>
                  <small>
                    {membership.conta?.username ? `@${membership.conta.username} · ` : ""}
                    Pedido em {membership.requested_at ? new Date(membership.requested_at).toLocaleString("pt-PT") : "data indisponível"}
                  </small>
                </div>
                <div className="actions" style={{ margin: 0 }}>
                  <span className="pill">{membership.estado}</span>
                  {membership.estado === "pendente" && (
                    <>
                      <button className="btn" disabled={busy === membership.id} onClick={() => decide(membership.id, "aceite")}>
                        {busy === membership.id ? "A atualizar…" : "Aceitar"}
                      </button>
                      <button className="btn danger" disabled={busy === membership.id} onClick={() => decide(membership.id, "rejeitado")}>
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="empty">Ainda não existem pedidos de admissão para esta empresa.</div>
        )}
      </div>
    </>
  );
}
