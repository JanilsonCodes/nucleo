
import { getSupabase } from '@/lib/supabase';
import { session, managerFor, memberFor, fail, ok } from '@/lib/api';

export async function GET(req) {
  try {
    const s = await session();
    const db = getSupabase();
    const url = new URL(req.url);

    const cid = Number(url.searchParams.get('empresa_id'));

    if (!Number.isSafeInteger(cid) || cid < 1) {
      return fail('Empresa inválida.', 400);
    }

    if (s.role === 'gerente') {
      await managerFor(db, s.id, cid);

      const { data, error } = await db
        .from('empresa_funcionarios')
.select(`
  *,
  conta:contas!empresa_funcionarios_funcionario_id_fkey (
    id,
    full_name,
    username
  )
`)
        .eq('empresa_id', cid)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const ids = (data || []).map(item => item.funcionario_id).filter(Boolean);
      let responses = [];
      if (ids.length) {
        const { data: assignments, error: assignmentError } = await db
          .from('evento_funcionarios')
          .select('id, funcionario_id, resposta, estado, motivo_rejeicao, assigned_at, evento:eventos!inner(id,nome_evento,inicio,fim,empresa_id)')
          .in('funcionario_id', ids)
          .eq('evento.empresa_id', cid)
          .order('assigned_at', { ascending: false });
        if (assignmentError) throw assignmentError;
        responses = assignments || [];
      }
      const members = (data || []).map(item => ({
        ...item,
        event_responses: responses.filter(a => a.funcionario_id === item.funcionario_id)
      }));
      return ok({
        members,
        pending: members.filter(item => item.estado === 'pendente')
      });
    }

    await memberFor(db, s.id, cid);

    return ok({ members: [] });

  } catch (error) {
    console.error('GET EMPRESA FUNCIONARIOS:', error);
    return fail(error);
  }
}

export async function POST(req) {
  try {
    const s = await session();

    if (s.role !== 'funcionario') {
      return fail('Apenas funcionários podem pedir admissão.', 403);
    }

    const body = await req.json();
    const cid = Number(body.empresa_id);

    if (!Number.isSafeInteger(cid) || cid < 1) {
      return fail('Empresa inválida.', 400);
    }

    const db = getSupabase();

    // Confirmar que a empresa existe
    const { data: company, error: companyError } = await db
      .from('empresas')
      .select('id')
      .eq('id', cid)
      .maybeSingle();

    if (companyError) throw companyError;

    if (!company) {
      return fail('Empresa não encontrada.', 404);
    }

    // Verificar pedido ou associação anterior
    const { data: existing, error: existingError } = await db
      .from('empresa_funcionarios')
      .select('id, estado')
      .eq('empresa_id', cid)
      .eq('funcionario_id', s.id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing && existing.estado !== 'rejeitado') {
      return fail(
        'Já existe um pedido ou associação para esta empresa.',
        409
      );
    }

    let result;

    if (existing) {
      result = await db
        .from('empresa_funcionarios')
        .update({
          estado: 'pendente',
          requested_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await db
        .from('empresa_funcionarios')
        .insert({
          empresa_id: cid,
          funcionario_id: s.id,
          estado: 'pendente'
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return ok({
      message: 'Pedido de admissão enviado com sucesso.',
      membership: result.data
    }, 201);

  } catch (error) {
    console.error('POST PEDIDO ADMISSAO:', error);
    return fail(error);
  }
}
