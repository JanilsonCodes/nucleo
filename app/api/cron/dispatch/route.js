import { getSupabase } from '@/lib/supabase';
import { sendPush } from '@/lib/push';
import { ok, fail } from '@/lib/api';

async function run(req) {
  try {
    const auth = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return fail('Não autorizado.', 401);
    const db = getSupabase();
    const now = new Date().toISOString();
    const { data: due, error } = await db.from('notificacoes').select('*')
      .eq('enviada', false).eq('cancelada', false).lte('agendada_para', now)
      .order('agendada_para', { ascending: true }).limit(200);
    if (error) throw error;
    let sent = 0, failed = 0, skipped = 0;
    for (const n of due || []) {
      // Evita lembretes para tarefas rejeitadas/removidas ou eventos cancelados.
      if (n.evento_funcionario_id && ['lembrete_09','lembrete_15','lembrete_20','lembrete_dia','lembrete_2h'].includes(n.tipo)) {
        const { data: a } = await db.from('evento_funcionarios').select('ativo,resposta,evento:eventos(estado)').eq('id', n.evento_funcionario_id).maybeSingle();
        if (!a || !a.ativo || a.resposta !== 'aceite' || a.evento?.estado === 'cancelado') {
          await db.from('notificacoes').update({ cancelada: true }).eq('id', n.id); skipped++; continue;
        }
      }
      const { data: subs, error: subError } = await db.from('push_subscriptions').select('*').eq('conta_id', n.funcionario_id).eq('ativo', true);
      if (subError) throw subError;
      for (const sub of subs || []) {
        try {
          await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, {
            title: n.titulo, body: n.mensagem,
            url: n.evento_id ? `/dashboard/eventos/${n.evento_id}` : '/dashboard/notificacoes'
          });
          sent++;
        } catch (e) {
          failed++;
          if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_subscriptions').update({ ativo: false }).eq('id', sub.id);
        }
      }
      // Marcar processada mesmo sem subscrição: a notificação interna continua disponível.
      const { error: markError } = await db.from('notificacoes').update({ enviada: true, enviada_em: now }).eq('id', n.id);
      if (markError) throw markError;
    }
    return ok({ processed: (due || []).length, pushSent: sent, pushFailed: failed, skipped });
  } catch (e) { return fail(e, 500); }
}
export async function POST(req) { return run(req); }
export async function GET(req) { return run(req); }
