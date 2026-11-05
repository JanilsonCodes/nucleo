const TIME_ZONE = 'Atlantic/Cape_Verde';
function dateInCV(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function atCV(day, hour) { return new Date(`${day}T${String(hour).padStart(2, '0')}:00:00-01:00`); }

// Agenda lembretes apenas para atribuições aceites. A rotina pode ser chamada
// novamente após uma alteração: os lembretes ainda não enviados são recriados.
export async function scheduleReminders(db, event, assignment) {
  const now = new Date();
  const start = new Date(event.inicio);
  if (event.estado === 'cancelado' || assignment.ativo === false || assignment.resposta !== 'aceite') {
    await db.from('notificacoes').update({ cancelada: true })
      .eq('evento_funcionario_id', assignment.id).eq('enviada', false)
      .in('tipo', ['lembrete_09', 'lembrete_15', 'lembrete_20', 'lembrete_dia', 'lembrete_2h']);
    return;
  }
  await db.from('notificacoes').update({ cancelada: true })
    .eq('evento_funcionario_id', assignment.id).eq('enviada', false)
    .in('tipo', ['lembrete_09', 'lembrete_15', 'lembrete_20', 'lembrete_dia', 'lembrete_2h']);

  const eventDay = dateInCV(start);
  const previous = new Date(`${eventDay}T12:00:00-01:00`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const previousDay = dateInCV(previous);
  const clock = start.toLocaleTimeString('pt-PT', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
  const base = { funcionario_id: assignment.funcionario_id, empresa_id: event.empresa_id, evento_id: event.id, evento_funcionario_id: assignment.id };
  const rows = [];
  for (const [hour, tipo] of [[9, 'lembrete_09'], [15, 'lembrete_15'], [20, 'lembrete_20']]) {
    const when = atCV(previousDay, hour);
    if (when > now) rows.push({ ...base, titulo: `Amanhã: ${event.nome_evento}`, mensagem: `Amanhã tens o evento ${event.nome_evento}. Local: ${event.zona}. Início: ${clock}.`, tipo, agendada_para: when.toISOString() });
  }
  const eventMorning = atCV(eventDay, 8);
  if (eventMorning > now) rows.push({ ...base, titulo: `Hoje: ${event.nome_evento}`, mensagem: `Hoje tens o evento ${event.nome_evento}. Local: ${event.zona}. Início: ${clock}.`, tipo: 'lembrete_dia', agendada_para: eventMorning.toISOString() });
  const twoHours = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  if (twoHours > now) rows.push({ ...base, titulo: `Faltam 2 horas: ${event.nome_evento}`, mensagem: `Faltam 2 horas para o evento ${event.nome_evento}. Local: ${event.zona}.`, tipo: 'lembrete_2h', agendada_para: twoHours.toISOString() });
  if (rows.length) {
    const { error } = await db.from('notificacoes').insert(rows);
    if (error) throw error;
  }
}
