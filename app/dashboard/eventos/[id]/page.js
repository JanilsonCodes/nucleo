
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function EventDetail() {
  const { id } = useParams();
  const [e, E] = useState(null);
  const [history, H] = useState([]);
  const [error, X] = useState("");

  async function load() {
    const [a, b] = await Promise.all([
      fetch("/api/events/" + id),
      fetch("/api/events/" + id + "/history")
    ]);

    const ad = await a.json();
    const bd = await b.json();

    if (!a.ok) X(ad.error);
    else E(ad.event);

    H(bd.history || []);
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function cancel() {
    if (!confirm("Cancelar este evento?")) return;

    const r = await fetch("/api/events/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "cancelado" })
    });

    const d = await r.json();

    if (!r.ok) X(d.error);
    else load();
  }

  if (!e) {
    return (
      <div className="event-loading">
        {error || "A carregar evento…"}
        <Link href="/dashboard/eventos">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="event-detail-page">

      <div className="page-head">
        <div>
          <div className="eyebrow">Detalhe do evento</div>
          <h1>{e.nome_evento}</h1>
          <p>
            {e.zona} · <span className="pill blue">{e.estado}</span>
          </p>
        </div>

        <div className="event-actions">
          <Link
            href="/dashboard/minhas-tarefas"
            className="btn event-task-btn"
          >
            <span>✓</span> Ver as minhas tarefas
          </Link>

          <button className="btn danger" onClick={cancel}>
            Cancelar evento
          </button>
        </div>
      </div>

      <div className="event-info-banner">
        <div className="event-banner-icon">📅</div>
        <div>
          <strong>Não te esqueças da tua participação</strong>
          <p>
            Consulta as tuas tarefas para aceitar ou rejeitar
            a participação neste evento.
          </p>
        </div>

        <Link href="/dashboard/minhas-tarefas" className="event-banner-link">
          Consultar →
        </Link>
      </div>

      <div className="columns">

        <section className="panel event-information">
          <h2>Informações</h2>

          <p>{e.descricao || "Sem descrição."}</p>

          <div className="event-date">
            <span>Início</span>
            <strong>
              {new Date(e.inicio).toLocaleString("pt-PT")}
            </strong>
          </div>

          <div className="event-date">
            <span>Fim</span>
            <strong>
              {new Date(e.fim).toLocaleString("pt-PT")}
            </strong>
          </div>

          <h2>As minhas atribuições / equipa</h2>

          {(e.assignments || []).map(a => (
            <div className="list-item" key={a.id}>
              <div>
                <strong>
                  {a.private_name || "Atribuição"}
                </strong>

                <small>
                  {a.private_funcao || "Função não definida"}
                  {" · "}
                  {a.private_materiais || "Sem materiais"}
                  {" · "}
                  Resposta: {a.resposta || "—"}

                  {a.motivo_rejeicao
                    ? " · Motivo: " + a.motivo_rejeicao
                    : ""}
                </small>
              </div>

              <span className="pill">{a.estado}</span>
            </div>
          ))}
        </section>

        <section className="panel event-history">
          <h2>Histórico</h2>

          {history.map(h => (
            <div className="list-item" key={h.id}>
              <div>
                <strong>{h.acao}</strong>
                <small>
                  {new Date(h.created_at).toLocaleString("pt-PT")}
                </small>
              </div>
            </div>
          ))}

          {!history.length && (
            <div className="empty">
              Ainda não existem registos no histórico.
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
