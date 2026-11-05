import Link from "next/link";

export const metadata = {
  title: "NÚCLEO",
  description: "NÚCLEO — Plataforma de gestão de eventos.",
  icons:{
    icon:"nucleo-mark.svg"
  }
};

export default function Home() { return <main className="shell"><header className="topbar"><div className="brand"><img src="/nucleo-brand.svg" alt="NUCLEO" /></div><div className="top-actions"><Link className="btn ghost" href="/login">Entrar</Link><Link className="btn" href="/registar">Criar conta</Link></div></header><section className="hero"><div><div className="eyebrow">Gestão de equipas, mais resultados</div><h1>O trabalho da tua equipa, <span>num só lugar.</span></h1><p>Organiza eventos, distribui responsabilidades e acompanha cada tarefa com clareza. O NUCLEO aproxima gerentes e funcionários para que todos saibam o que fazer e quando fazer.</p><div className="actions"><Link className="btn" href="/registar">Começar gratuitamente</Link><Link className="btn secondary" href="/login">Já tenho conta</Link></div></div><div className="hero-art"><img src="/nucleo-mark.svg" alt="Símbolo NUCLEO" /></div></section><section className="feature-grid"><article className="feature"><div className="eyebrow">01 / Organização</div><h3>Calendário centralizado</h3><p>Planeia eventos, horários e locais num espaço partilhado por toda a equipa.</p></article><article className="feature"><div className="eyebrow">02 / Responsabilidade</div><h3>Tarefas individuais</h3><p>Cada funcionário vê a sua função, os materiais necessários e o estado do seu trabalho.</p></article><article className="feature"><div className="eyebrow">03 / Comunicação</div><h3>Notificações atempadas</h3><p>Recebe atualizações e lembretes para que nenhum compromisso passe despercebido.</p></article></section><footer className="footer">NUCLEO · Organiza · Coordena · Conquista</footer></main> }
