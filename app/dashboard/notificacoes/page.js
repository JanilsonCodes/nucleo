
"use client";

import { useEffect, useState } from "react";

function decodeVapidKey(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = normalized.padEnd(
    Math.ceil(normalized.length / 4) * 4,
    "="
  );

  return Uint8Array.from(
    atob(padded),
    (char) => char.charCodeAt(0)
  );
}

async function getActiveServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "Este navegador não suporta Service Workers."
    );
  }

  const registration =
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

  // Esperar até existir um Service Worker ativo.
  const readyRegistration = await navigator.serviceWorker.ready;

  if (!readyRegistration.active) {
    throw new Error(
      "O Service Worker ainda não está ativo. Atualiza a página e tenta novamente."
    );
  }

  return readyRegistration;
}

export default function Notifications() {
  const [rows, R] = useState([]);
  const [pushMsg, P] = useState("");
  const [pushBusy, B] = useState(false);
  const [loading, L] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível carregar as notificações."
        );
      }

      R(data.notifications || []);
    } catch (error) {
      console.error("NOTIFICATIONS LOAD ERROR:", error);
      P(error.message);
    } finally {
      L(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function read(id) {
    try {
      const response = await fetch(
        "/api/notifications/" + id,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lida: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível atualizar a notificação."
        );
      }

      await load();
    } catch (error) {
      P(error.message);
    }
  }

  async function enablePush() {
    if (pushBusy) return;

    B(true);
    P("");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error(
          "Este navegador não suporta notificações Push."
        );
      }

      if (!window.isSecureContext) {
        throw new Error(
          "As notificações precisam de HTTPS ou localhost."
        );
      }

      // 1. Pedir autorização.
      const permission =
        await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error(
          "Permissão de notificações não concedida."
        );
      }

      // 2. Registar e aguardar o Service Worker ativo.
      const registration =
        await getActiveServiceWorker();

      // 3. Obter a chave pública VAPID.
      const keyResponse = await fetch(
        "/api/push/key",
        {
          cache: "no-store",
        }
      );

      const keyData = await keyResponse.json();

      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(
          keyData.error ||
          "Não foi possível obter a chave pública VAPID."
        );
      }

      // 4. Verificar se já existe uma subscrição.
      let subscription =
        await registration.pushManager.getSubscription();

      // 5. Criar apenas se ainda não existir.
      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeVapidKey(
              keyData.publicKey
            ),
          });
      }

      // 6. Guardar a subscrição no servidor.
      const saveResponse = await fetch(
        "/api/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription),
        }
      );

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          saveData.error ||
          "Não foi possível guardar a subscrição."
        );
      }

      P(
        "Notificações Push ativadas com sucesso neste dispositivo."
      );

    } catch (error) {
      console.error(
        "NUCLEO PUSH SUBSCRIBE ERROR:",
        error
      );

      P(
        error.message ||
        "Não foi possível ativar as notificações Push."
      );

    } finally {
      B(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Centro de atividade
          </div>

          <h1>Notificações</h1>

          <p>
            Atualizações sobre eventos, tarefas e pedidos.
          </p>
        </div>

        <button
          className="btn"
          onClick={enablePush}
          disabled={pushBusy}
        >
          {pushBusy
            ? "A ativar notificações..."
            : "Ativar notificações Push"}
        </button>
      </div>

      {pushMsg && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
        >
          {pushMsg}
        </div>
      )}

      <div className="panel">
        {loading ? (
          <div className="empty">
            A carregar notificações...
          </div>
        ) : (
          <>
            {rows.map((n) => (
              <div
                className="list-item"
                key={n.id}
              >
                <div>
                  <strong>{n.titulo}</strong>

                  <small>
                    {n.mensagem} ·{" "}
                    {new Date(
                      n.created_at
                    ).toLocaleString("pt-PT")}
                  </small>
                </div>

                {!n.lida && (
                  <button
                    className="btn secondary"
                    onClick={() => read(n.id)}
                  >
                    Marcar lida
                  </button>
                )}
              </div>
            ))}

            {!rows.length && (
              <div className="empty">
                Não tens notificações.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
