
import { getSupabase } from '@/lib/supabase';
import {
  session,
  managerFor,
  fail,
  ok
} from '@/lib/api';

export async function PATCH(req, { params }) {
  try {
    const s = await session();

    if (s.role !== 'gerente') {
      return fail('Apenas gerentes podem rever pedidos.', 403);
    }

    const { id } = await params;
    const membershipId = Number(id);

    if (!Number.isSafeInteger(membershipId) || membershipId < 1) {
      return fail('Pedido inválido.', 400);
    }

    const { estado } = await req.json();

    if (!['aceite', 'rejeitado'].includes(estado)) {
      return fail('Estado inválido.', 400);
    }

    const db = getSupabase();

    // Procurar pedido
    const { data: membership, error } = await db
      .from('empresa_funcionarios')
      .select('*')
      .eq('id', membershipId)
      .maybeSingle();

    if (error) throw error;

    if (!membership) {
      return fail('Pedido não encontrado.', 404);
    }

    // Confirmar que o gerente pertence à empresa
    await managerFor(
      db,
      s.id,
      membership.empresa_id
    );

    const cancellingAccepted = membership.estado === 'aceite' && estado === 'rejeitado';
    if (membership.estado !== 'pendente' && !cancellingAccepted) {
      return fail('Este pedido já foi analisado.', 409);
    }

    // Atualizar pedido
    const { data: updated, error: updateError } = await db
      .from('empresa_funcionarios')
      .update({
        estado,
        reviewed_at: new Date().toISOString(),
        reviewed_by: s.id
      })
      .eq('id', membershipId)
      .eq('estado', membership.estado)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notificar funcionário
    const { error: notificationError } = await db
      .from('notificacoes')
      .insert({
        funcionario_id: membership.funcionario_id,
        empresa_id: membership.empresa_id,
        agendada_para: new Date().toISOString(),
        titulo: estado === 'aceite'
          ? 'Pedido aceite'
          : 'Pedido rejeitado',
        mensagem: estado === 'aceite'
          ? 'O teu pedido de entrada na empresa foi aceite.'
          : cancellingAccepted
            ? 'O teu acesso à empresa foi cancelado pelo gerente.'
            : 'O teu pedido de entrada na empresa foi rejeitado.',
        tipo: 'admissao'
      });

    if (notificationError) {
      console.error('NOTIFICATION ERROR:', notificationError);
    }

    // Desativar futuras atribuições se for rejeitado
    if (estado === 'rejeitado') {
      const { data: assigned, error: assignedError } = await db
        .from('evento_funcionarios')
        .select('id, evento:eventos!inner(inicio,empresa_id)')
        .eq('funcionario_id', membership.funcionario_id)
        .eq('evento.empresa_id', membership.empresa_id)
        .eq('ativo', true);

      if (assignedError) throw assignedError;

      for (const assignment of assigned || []) {
        if (
          assignment.evento &&
          new Date(assignment.evento.inicio) > new Date()
        ) {
          await db
            .from('evento_funcionarios')
            .update({
              ativo: false,
              removed_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          await db
            .from('notificacoes')
            .update({ cancelada: true })
            .eq('evento_funcionario_id', assignment.id)
            .eq('enviada', false);
        }
      }
    }

    return ok({
      message: estado === 'aceite'
        ? 'Funcionário admitido com sucesso.'
        : cancellingAccepted
          ? 'Acesso do funcionário cancelado.'
          : 'Pedido rejeitado com sucesso.',
      membership: updated
    });

  } catch (error) {
    console.error('PATCH PEDIDO ADMISSAO:', error);
    return fail(error);
  }
}
