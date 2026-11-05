import {getSupabase} from '@/lib/supabase';
import {session,fail,ok} from '@/lib/api';

export async function GET(){
  try {
    const s=await session(),db=getSupabase();
    if(s.role!=='funcionario') return fail('Esta área é exclusiva de funcionários.',403);
    const {data,error}=await db.from('evento_funcionarios')
      .select('*,evento:eventos(id,nome_evento,descricao,zona,inicio,fim,estado,empresa_id,empresa:empresas(id,nome,logo))')
      .eq('funcionario_id',s.id).eq('ativo',true).order('assigned_at',{ascending:false});
    if(error) throw error;
    const now=Date.now();
    const tasks=(data||[]).filter(a=>a.evento).map(a=>({...a,estado:a.estado==='concluido'?'concluido':now>=new Date(a.evento.inicio).getTime()&&now<=new Date(a.evento.fim).getTime()&&a.resposta==='aceite'?'em_curso':a.estado}));
    return ok({tasks});
  } catch(e){return fail(e)}
}
