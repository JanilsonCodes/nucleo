"use client";


import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function Events() {
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState("");
  const [modal, setModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome_evento: "",
    descricao: "",
    zona: "",
    inicio: "",
    fim: "",
  });

  const [chosen, setChosen] = useState([]);
  const [details, setDetails] = useState({});

  const load = useCallback(async (id) => {
    if (!id) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);

      const r = await fetch(
        `/api/events?empresa_id=${encodeURIComponent(id)}`
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || "Não foi possível carregar os eventos.");
      }

      setItems(d.events || []);
    } catch (error) {
      setErr(error.message || "Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async (id) => {
    if (!id) {
      setEmployees([]);
      return;
    }

    try {
      const r = await fetch(
        `/api/memberships?empresa_id=${encodeURIComponent(id)}`
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || "Erro ao carregar funcionários.");
      }

      const approved = (d.members || []).filter(
        (member) => member.estado === "aceite"
      );

      setEmployees(approved);
    } catch (error) {
      setEmployees([]);
      setErr(error.message || "Erro ao carregar funcionários.");
    }
  }, []);

  const refresh = useCallback(async (id) => {
    setErr("");
    setCompany(id);

    if (!id) {
      setItems([]);
      setEmployees([]);
      return;
    }

    await Promise.all([
      load(id),
      loadEmployees(id),
    ]);
  }, [load, loadEmployees]);

  useEffect(() => {
    function go() {
      const id = localStorage.getItem("nucleo_company") || "";
      refresh(id);
    }

    go();

    window.addEventListener("nucleo-company-change", go);

    return () => {
      window.removeEventListener("nucleo-company-change", go);
    };
  }, [refresh]);

  function updateDetail(id, field, value) {
    setDetails((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        [field]: value,
      },
    }));
  }

  function resetForm() {
    setForm({
      nome_evento: "",
      descricao: "",
      zona: "",
      inicio: "",
      fim: "",
    });

    setChosen([]);
    setDetails({});
  }

  async function create(e) {
    e.preventDefault();

    if (saving) return;

    if (!company) {
      setErr("Nenhuma empresa selecionada.");
      return;
    }

    if (!form.nome_evento.trim()) {
      setErr("Introduz o nome do evento.");
      return;
    }

    if (!form.zona.trim()) {
      setErr("Introduz o local do evento.");
      return;
    }

    if (!form.inicio || !form.fim) {
      setErr("Preenche a data e hora de início e fim.");
      return;
    }

    const inicio = new Date(form.inicio);
    const fim = new Date(form.fim);

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fim.getTime())
    ) {
      setErr("Introduz datas e horas válidas.");
      return;
    }

    if (fim.getTime() <= inicio.getTime()) {
      setErr("A hora de fim deve ser posterior à hora de início.");
      return;
    }

    const invalidAssignment = chosen.some(
      (id) => !employees.some(
        (member) => member.funcionario_id === id
      )
    );

    if (invalidAssignment) {
      setErr("Existe um funcionário selecionado inválido.");
      return;
    }

    const payload = {
      nome_evento: form.nome_evento.trim(),
      descricao: form.descricao.trim(),
      zona: form.zona.trim(),
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      empresa_id: company,
      funcionarios: chosen.map((id) => ({
        funcionario_id: id,
        funcao: details[id]?.funcao?.trim() || "",
        materiais: details[id]?.materiais?.trim() || "",
      })),
    };

    try {
      setSaving(true);
      setErr("");

      const r = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const d = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(
          d.error || `Erro ao criar evento (${r.status}).`
        );
      }

      setModal(false);
      resetForm();

      await load(company);

    } catch (error) {
      setErr(error.message || "Não foi possível criar o evento.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = items.filter((event) =>
    (event.nome_evento || "")
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Planeamento</div>
          <h1>Eventos</h1>
          <p>Cria, acompanha e atualiza os eventos da empresa.</p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => {
            setErr("");
            setModal(true);
          }}
          disabled={!company}
        >
          ＋ Novo evento
        </button>
      </div>

      {err && (
        <div className="notice" role="alert">
          {err}
        </div>
      )}

      <div className="toolbar">
        <input
          placeholder="Pesquisar evento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Local</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((event) => (
              <tr key={event.id}>
                <td>
                  <strong>{event.nome_evento}</strong>
                </td>

                <td>{event.zona || "—"}</td>

                <td>
                  {event.inicio
                    ? new Date(event.inicio).toLocaleString("pt-PT")
                    : "—"}
                </td>

                <td>
                  {event.fim
                    ? new Date(event.fim).toLocaleString("pt-PT")
                    : "—"}
                </td>

                <td>
                  <span className="pill blue">
                    {event.estado}
                  </span>
                </td>

                <td>
                  <Link
                    className="link"
                    href={`/dashboard/eventos/${event.id}`}
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="empty">A carregar eventos...</div>
        )}

        {!loading && !filtered.length && (
          <div className="empty">
            Sem eventos para apresentar.
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-back">
          <form className="modal" onSubmit={create}>
            <div className="modal-head">
              <h2>Criar evento</h2>

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setModal(false);
                  setErr("");
                }}
                disabled={saving}
              >
                Fechar
              </button>
            </div>

            <div className="field">
              <label>Nome do evento *</label>

              <input
                required
                value={form.nome_evento}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nome_evento: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>Descrição</label>

              <textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descricao: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>Zona / local *</label>

              <input
                required
                value={form.zona}
                onChange={(e) =>
                  setForm({
                    ...form,
                    zona: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid2">
              <div className="field">
                <label>Início *</label>

                <input
                  type="datetime-local"
                  required
                  value={form.inicio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inicio: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>Fim *</label>

                <input
                  type="datetime-local"
                  required
                  value={form.fim}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fim: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Funcionários</label>

              <div className="check-list">
                {employees.map((member) => (
                  <label
                    className="check-row"
                    key={member.funcionario_id}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(member.funcionario_id)}
                      onChange={(e) =>
                        setChosen((previous) =>
                          e.target.checked
                            ? [...previous, member.funcionario_id]
                            : previous.filter(
                              (id) => id !== member.funcionario_id
                            )
                        )
                      }
                    />

                    {member.conta?.full_name ||
                      member.funcionario_id}
                  </label>
                ))}

                {!employees.length && (
                  <small className="muted">
                    Ainda não existem funcionários aprovados.
                  </small>
                )}
              </div>
            </div>

            {chosen.map((id) => {
              const member = employees.find(
                (item) => item.funcionario_id === id
              );

              return (
                <div
                  className="panel"
                  style={{
                    padding: 14,
                    marginBottom: 10,
                  }}
                  key={id}
                >
                  <b>
                    {member?.conta?.full_name || "Funcionário"}
                  </b>

                  <div className="grid2">
                    <div className="field">
                      <label>Função individual</label>

                      <input
                        value={details[id]?.funcao || ""}
                        onChange={(e) =>
                          updateDetail(id, "funcao", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Materiais necessários</label>

                      <input
                        value={details[id]?.materiais || ""}
                        onChange={(e) =>
                          updateDetail(id, "materiais", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="submit"
              className="btn full"
              disabled={saving || !company}
            >
              {saving ? "A publicar..." : "Publicar evento"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}


//Number.isNaN(inicio.getTime()) 