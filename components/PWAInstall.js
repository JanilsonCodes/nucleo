"use client";

import { useEffect, useState } from "react";

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("other");
  const [isSafari, setIsSafari] = useState(false);
  const [secure, setSecure] = useState(true);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

    setPlatform(ios ? "ios" : /Android/i.test(ua) ? "android" : "other");
    setIsSafari(safari);
    setInstalled(standalone);
    setSecure(window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1");

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Register immediately after hydration; do not wait for window.load (which may have fired already).
    if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .then((registration) => registration.update().catch(() => {}))
        .catch((error) => console.error("Não foi possível registar o Service Worker do Núcleo:", error));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (installed) return;
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === "accepted") setInstalled(true);
      } catch (error) {
        console.error("Falha ao abrir a instalação:", error);
        setOpen(true);
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }
    setOpen(true);
  }

  if (installed) return null;

  return (
    <>
      <button type="button" className="pwa-install-button" onClick={handleInstall} aria-haspopup="dialog">
        <img src="/icon-192.png" alt="" />
        <span>Instalar Núcleo</span>
      </button>

      {open && (
        <div className="pwa-modal-backdrop" onClick={() => setOpen(false)}>
          <section className="pwa-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-title" onClick={(event) => event.stopPropagation()}>
            <button className="pwa-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
            <img className="pwa-modal-logo" src="/icon-192.png" alt="Logótipo Núcleo" />
            <h2 id="pwa-title">Instalar Núcleo</h2>

            {platform === "ios" ? (
              <>
                <p className="pwa-intro">No iPhone, a instalação é feita pelo Safari. Não é um download da App Store.</p>
                {!isSafari && <p className="pwa-tip">Estás noutro navegador. Copia/abre o endereço do Núcleo no Safari para aparecer a opção de instalação.</p>}
                <ol className="pwa-steps">
                  <li><span>1</span><div><b>Toca em Partilhar</b><p>No Safari, toca no ícone de partilha na barra inferior.</p><img src="/images/install/iphone-1.svg" alt="Ilustração do menu Partilhar no iPhone" /></div></li>
                  <li><span>2</span><div><b>Seleciona Adicionar ao ecrã principal</b><p>Se necessário, desliza a lista para encontrar esta opção.</p><img src="/images/install/iphone-2.svg" alt="Ilustração da opção Adicionar ao ecrã principal" /></div></li>
                  <li><span>3</span><div><b>Confirma em Adicionar</b><p>O ícone do Núcleo ficará disponível no ecrã principal.</p><img src="/images/install/iphone-3.svg" alt="Ilustração da confirmação de instalação" /></div></li>
                </ol>
              </>
            ) : (
              <>
                {deferredPrompt ? <p>O teu navegador está pronto para instalar o Núcleo.</p> : <p>Abre o menu do navegador e escolhe <b>Instalar aplicação</b> ou <b>Adicionar ao ecrã principal</b>.</p>}
                {!secure && <p className="pwa-tip">A instalação exige HTTPS. Publica o site com certificado HTTPS ou testa em localhost.</p>}
                {platform === "android" && <p className="pwa-tip">No Android, também podes abrir o menu ⋮ do Chrome e escolher “Instalar aplicação”.</p>}
              </>
            )}
            <button className="pwa-install-confirm" type="button" onClick={() => setOpen(false)}>Entendi</button>
          </section>
        </div>
      )}
    </>
  );
}
