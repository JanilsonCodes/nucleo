const TIME_ZONE = 'Atlantic/Cape_Verde';
function dateInCV(date) { return new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
function atCV(day,hour) { return new Date(`${day}T${String(hour).padStart(2,'0')}:00:00-01:00`); }

export async function scheduleReminders(db,event,assignment) {
  const now=new Date(), start=new Date(event.inicio);
  const types=['lembrete_10','lembrete_16','lembrete_20','lembrete_2h'];
  await db.from('notificacoes').update({cancelada:true}).eq('evento_funcionario_id',assignment.id).eq('enviada',false).in('tipo',types);
  if(event.estado==='cancelado'||assignment.ativo===false||assignment.resposta!=='aceite') return;
  const day=dateInCV(start), noon=atCV(day,12), previous=new Date(noon.getTime()-86400000), prevDay=dateInCV(previous);
  const clock=start.toLocaleTimeString('pt-PT',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit'});
  const base={funcionario_id:assignment.funcionario_id,empresa_id:event.empresa_id,evento_id:event.id,evento_funcionario_id:assignment.id};
  const rows=[];
  for(const [hour,tipo] of [[10,'lembrete_10'],[16,'lembrete_16'],[20,'lembrete_20']]) { const at=atCV(prevDay,hour); if(at>now) rows.push({...base,titulo:`Amanhã: ${event.nome_evento}`,mensagem:`Amanhã tens o evento ${event.nome_evento}. Local: ${event.zona}. Início: ${clock}.`,tipo,agendada_para:at.toISOString()}); }
  const twoHours=new Date(start.getTime()-7200000);
  if(twoHours>now) rows.push({...base,titulo:`Faltam 2 horas: ${event.nome_evento}`,mensagem:`Faltam 2 horas para ${event.nome_evento}. Local: ${event.zona}.`,tipo:'lembrete_2h',agendada_para:twoHours.toISOString()});
  if(rows.length){const {error}=await db.from('notificacoes').insert(rows);if(error)throw error;}
}

export async function scheduleManagerReminders(db,event) {
  if(!event.criado_por||event.estado==='cancelado') return;
  const now=new Date(),start=new Date(event.inicio),day=dateInCV(start),previous=dateInCV(new Date(atCV(day,12).getTime()-86400000));
  const oldTypes=['lembrete_10','lembrete_16','lembrete_20','lembrete_2h'];
  await db.from('notificacoes').update({cancelada:true}).eq('evento_id',event.id).eq('funcionario_id',event.criado_por).is('evento_funcionario_id',null).eq('enviada',false).in('tipo',oldTypes);
  const base={funcionario_id:event.criado_por,empresa_id:event.empresa_id,evento_id:event.id,evento_funcionario_id:null};
  const clock=start.toLocaleTimeString('pt-PT',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit'}),rows=[];
  for(const [hour,tipo] of [[10,'lembrete_10'],[16,'lembrete_16'],[20,'lembrete_20']]){const at=atCV(previous,hour);if(at>now)rows.push({...base,titulo:`Amanhã: ${event.nome_evento}`,mensagem:`Amanhã tens o evento ${event.nome_evento}. Local: ${event.zona}. Início: ${clock}.`,tipo,agendada_para:at.toISOString()});}
  const two=new Date(start.getTime()-7200000);if(two>now)rows.push({...base,titulo:`Faltam 2 horas: ${event.nome_evento}`,mensagem:`Faltam 2 horas para ${event.nome_evento}. Local: ${event.zona}.`,tipo:'lembrete_2h',agendada_para:two.toISOString()});
  if(rows.length){const {error}=await db.from('notificacoes').insert(rows);if(error)throw error;}
}
