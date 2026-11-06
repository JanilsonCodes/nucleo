
import { getSupabase } from "@/lib/supabase";
import {
  session,
  managerFor,
  memberFor,
  fail,
  ok,
} from "@/lib/api";
import { sendPush } from "@/lib/push";

const TIMEZONE = "Atlantic/Cape_Verde";

function state(start, end) {
  const now = Date.now();

  if (now < new Date(start).getTime()) return "pendente";
  if (now <= new Date(end).getTime()) return "em_curso";

  return "concluido";
}

// Interpreta datetime-local no fuso horário de Cabo Verde.
function parseCV(value) {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)
  ) {
    return new Date(
      `${value.length === 16 ? value + ":00" : value}-01:00`
    );
  }

  return new Date(value);
}

function getCVDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function createCVDate(date, hour) {
  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:00:00-01:00`
  );
}

function formatCV(date) {
  return new Date(date).toLocaleString("pt-PT", {
    timeZone: TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Envia uma notificação a uma conta.
async function notifyAccount(db, accountId, data) {
  const { data: notification, error } = await db
    .from("notificacoes")
    .insert({
      funcionario_id: accountId,
      empresa_id: data.empresa_id,
      evento_id: data.evento_id,
      evento_funcionario_id: data.assignment_id || null,
      titulo: data.titulo,
      mensagem: data.mensagem,
      tipo: data.tipo,
      agendada_para: data.scheduled_at,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Notificações futuras ficam apenas agendadas.
  if (new Date(data.scheduled_at).getTime() > Date.now()) {
    return notification;
  }

  const { data: subscriptions, error: subscriptionError } =
    await db
      .from("push_subscriptions")
      .select("*")
      .eq("conta_id", accountId)
      .eq("ativo", true);

  if (subscriptionError) throw subscriptionError;

  let delivered = false;

  if (
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  ) {
    for (const sub of subscriptions || []) {
      try {
        await sendPush(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          {
            title: data.titulo,
            body: data.mensagem,
            url: `/dashboard/eventos/${data.evento_id}`,
          }
        );

        delivered = true;
      } catch (error) {
        if (
          error.statusCode === 404 ||
          error.statusCode === 410
        ) {
          await db
            .from("push_subscriptions")
            .update({ ativo: false })
            .eq("id", sub.id);
        } else {
          console.error("Erro ao enviar Push:", error);
        }
      }
    }
  }

  if (delivered) {
    const { error: updateError } = await db
      .from("notificacoes")
      .update({
        enviada: true,
        enviada_em: new Date().toISOString(),
      })
      .eq("id", notification.id);

    if (updateError) throw updateError;
  }

  return notification;
}

// Cria os quatro lembretes de cada destinatário.
async function scheduleReminders(db, accountId, event, assignmentId = null) {
  const start = new Date(event.inicio);

  const eventDay = getCVDate(start);

  const previousDayDate = new Date(
    createCVDate(eventDay, 12).getTime() - 86400000
  );

  const previousDay = getCVDate(previousDayDate);

  const recipients = [
    { hour: 10, type: "lembrete_10" },
    { hour: 16, type: "lembrete_16" },
    { hour: 20, type: "lembrete_20" },
  ];

  for (const reminder of recipients) {
    const scheduled = createCVDate(
      previousDay,
      reminder.hour
    );

    if (scheduled <= new Date()) continue;

    await notifyAccount(db, accountId, {
      empresa_id: event.empresa_id,
      evento_id: event.id,
      assignment_id: assignmentId,
      titulo: `Lembrete: ${event.nome_evento}`,
      mensagem:
        `Amanhã tens o evento ${event.nome_evento}. ` +
        `Local: ${event.zona}. ` +
        `Início: ${formatCV(start)}.`,
      tipo: reminder.type,
      scheduled_at: scheduled.toISOString(),
    });
  }

  const twoHours = new Date(
    start.getTime() - 2 * 60 * 60 * 1000
  );

  if (twoHours > new Date()) {
    await notifyAccount(db, accountId, {
      empresa_id: event.empresa_id,
      evento_id: event.id,
      assignment_id: assignmentId,
      titulo: `Faltam 2 horas: ${event.nome_evento}`,
      mensagem:
        `Faltam 2 horas para o evento ${event.nome_evento}. ` +
        `Local: ${event.zona}.`,
      tipo: "lembrete_2h",
      scheduled_at: twoHours.toISOString(),
    });
  }
}

// GET: consultar eventos.
export async function GET(req) {
  try {
    const s = await session();
    const db = getSupabase();

    const cid = Number(
      new URL(req.url).searchParams.get("empresa_id")
    );

    if (!Number.isSafeInteger(cid) || cid <= 0) {
      return fail("Empresa inválida.");
    }

    if (s.role === "gerente") {
      await managerFor(db, s.id, cid);

      const { data, error } = await db
        .from("eventos")
        .select("*")
        .eq("empresa_id", cid)
        .order("inicio");

      if (error) throw error;

      const events = (data || []).map((event) => ({
        ...event,
        estado:
          event.estado === "cancelado"
            ? "cancelado"
            : state(event.inicio, event.fim),
      }));

      return ok({ events });
    }

    await memberFor(db, s.id, cid);

    const { data, error } = await db
      .from("evento_funcionarios")
      .select("evento:eventos(*)")
      .eq("funcionario_id", s.id)
      .eq("ativo", true);

    if (error) throw error;

    const events = (data || [])
      .map((item) => item.evento)
      .filter((event) => event && event.empresa_id === cid)
      .map((event) => ({
        ...event,
        estado:
          event.estado === "cancelado"
            ? "cancelado"
            : state(event.inicio, event.fim),
      }));

    return ok({ events });
  } catch (error) {
    console.error("GET EVENTS:", error);
    return fail(error);
  }
}

// POST: criar evento.
export async function POST(req) {
  try {
    const s = await session();

    if (s.role !== "gerente") {
      return fail("Apenas gerentes podem criar eventos.", 403);
    }

    const b = await req.json();

    const cid = Number(b.empresa_id);
    const start = parseCV(b.inicio);
    const end = parseCV(b.fim);

    if (
      !Number.isSafeInteger(cid) ||
      cid <= 0 ||
      !b.nome_evento?.trim() ||
      !b.zona?.trim() ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return fail("Verifica o nome, local e intervalo de datas.");
    }

    if (
      !Array.isArray(b.funcionarios) ||
      b.funcionarios.length > 200
    ) {
      return fail("Lista de funcionários inválida.");
    }

    const db = getSupabase();

    await managerFor(db, s.id, cid);

    // Validar todos os funcionários antes de criar o evento.
    const employeeIds = [
      ...new Set(
        b.funcionarios.map((item) => Number(item.funcionario_id))
      ),
    ];

    if (
      employeeIds.some(
        (id) => !Number.isSafeInteger(id) || id <= 0
      )
    ) {
      return fail("Existe um funcionário com ID inválido.");
    }

    if (employeeIds.length) {
      const { data: memberships, error } = await db
        .from("empresa_funcionarios")
        .select("funcionario_id")
        .eq("empresa_id", cid)
        .eq("estado", "aceite")
        .in("funcionario_id", employeeIds);

      if (error) throw error;

      const approvedIds = new Set(
        (memberships || []).map((item) => item.funcionario_id)
      );

      if (employeeIds.some((id) => !approvedIds.has(id))) {
        return fail(
          "Um ou mais funcionários não pertencem à empresa ou não foram aprovados."
        );
      }
    }

    // Criar evento.
    const { data: event, error: eventError } = await db
      .from("eventos")
      .insert({
        empresa_id: cid,
        nome_evento: b.nome_evento.trim(),
        descricao: b.descricao?.trim() || null,
        zona: b.zona.trim(),
        inicio: start.toISOString(),
        fim: end.toISOString(),
        criado_por: s.id,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Registar histórico.
    const { error: historyError } = await db
      .from("historico_eventos")
      .insert({
        evento_id: event.id,
        conta_id: s.id,
        acao: "Evento criado",
        dados_novos: event,
      });

    if (historyError) {
      console.error("HISTÓRICO:", historyError);
    }

    const eventInfo = {
      empresa_id: cid,
      evento_id: event.id,
      assignment_id: null,
    };

    // Notificação imediata ao gerente.
    await notifyAccount(db, s.id, {
      ...eventInfo,
      titulo: `Evento criado: ${event.nome_evento}`,
      mensagem:
        `${event.nome_evento} foi criado com sucesso. ` +
        `Local: ${event.zona}. Início: ${formatCV(start)}.`,
      tipo: "publicacao",
      scheduled_at: new Date().toISOString(),
    });

    // Lembretes do gerente.
    await scheduleReminders(db, s.id, event);

    const assignments = [];

    // Atribuir funcionários.
    for (const item of b.funcionarios) {
      const fid = Number(item.funcionario_id);

      const { data: assignment, error: assignmentError } =
        await db
          .from("evento_funcionarios")
          .insert({
            evento_id: event.id,
            funcionario_id: fid,
            funcao: item.funcao?.trim() || null,
            materiais: item.materiais?.trim() || null,
          })
          .select()
          .single();

      if (assignmentError) throw assignmentError;

      assignments.push(assignment);

      const message =
        `${event.nome_evento} · ${event.zona} · ` +
        `${formatCV(start)} · ` +
        `Função: ${item.funcao || "A definir"} · ` +
        `Materiais: ${item.materiais || "A definir"}`;

      // Notificação imediata ao funcionário.
      await notifyAccount(db, fid, {
        ...eventInfo,
        assignment_id: assignment.id,
        titulo: `Novo evento: ${event.nome_evento}`,
        mensagem: message,
        tipo: "publicacao",
        scheduled_at: new Date().toISOString(),
      });

      // Lembretes do funcionário.
      await scheduleReminders(
        db,
        fid,
        event,
        assignment.id
      );
    }

    return ok(
      {
        event,
        assignments,
        message: "Evento criado com sucesso.",
      },
      201
    );
  } catch (error) {
    console.error("POST EVENTS:", error);
    return fail(error);
  }
}
