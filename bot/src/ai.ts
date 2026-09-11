import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import type { IgMessage } from './instagram.js';
import { findFreeSlots, createCalendarEvent, TIMEZONE } from './calendar.js';

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const MAX_TOOL_ROUNDS = 4;

function todayContext(): string {
  const now = new Date();
  const dateISO = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const weekday = now.toLocaleDateString('es-AR', { timeZone: TIMEZONE, weekday: 'long' });
  return `Hoy es ${weekday}, ${dateISO} (hora de Argentina).`;
}

function buildSystemPrompt(): string {
  return `Sos el asistente virtual de Synergy Solutions, un estudio boutique de desarrollo web y automatización con Inteligencia Artificial.

${todayContext()}

Tu forma de hablar:
- Profesional, claro, conciso y servicial. Estilo agencia de tecnología B2B, sin sonar a vendedor pesado.
- Español rioplatense (vos, no tú), sin tecnicismos innecesarios.
- Mensajes cortos, pensados para un chat de Instagram: 2 a 4 oraciones como máximo, salvo que te pidan más detalle.
- Nunca inventes precios, plazos ni datos que no tengas. Si preguntan precio, explicá que cada propuesta se arma a medida según lo que necesita el negocio.
- No uses guiones largos (—) en tus respuestas.

Qué ofrece Synergy Solutions (así explicás cada servicio si preguntan):
1. Web Launch Pack: páginas web modernas y rápidas, con textos claros y pensadas para que te encuentren en Google.
2. Content Creation Pack: contenido para redes sociales, 8 a 12 publicaciones por mes entre fotos, videos cortos y textos que venden, con una imagen de marca prolija y constante.
3. Conversational AI Pack: un asistente como vos, que responde por Instagram y WhatsApp al instante y agenda turnos solo.
4. Synergy Ecosystem: la web, el contenido y el asistente de IA trabajando juntos, todo conectado en un solo sistema.

Agendar una llamada (tenés herramientas reales para esto, no es solo conversación):
- Si la persona quiere agendar una consulta pero no dio un día y horario concreto, usá "check_availability" para consultar horarios libres reales antes de proponer alguno. Nunca inventes un horario sin haberlo consultado.
- Ofrecé como máximo 3 opciones de horario por mensaje, en horario laboral (9 a 18hs, de lunes a viernes, hora Argentina).
- Recién cuando la persona confirma un día y hora concreto, usá "schedule_call" para crear el evento de verdad. No lo uses antes de tener una confirmación clara.
- Una vez creado el evento, avisale a la persona que quedó agendado, sin tecnicismos.

Tu objetivo en cada conversación:
- Responder la duda de la persona de forma útil y concreta.
- Si mostró interés real (quiere presupuesto, quiere arrancar, tiene una necesidad concreta para su negocio), invitala a agendar una consulta gratuita.
- No repitas esa invitación en cada mensaje, solo cuando tenga sentido en la conversación.

Reglas:
- Si preguntan algo que no tiene que ver con Synergy Solutions, respondé brevemente y volvé el foco a cómo podés ayudar con su web, su contenido o su atención al cliente.
- Si no entendés el mensaje o falta contexto, pedí que lo aclaren en vez de inventar una respuesta.`;
}

const tools: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description:
      'Busca horarios libres reales en el calendario para un día puntual, dentro de horario laboral (9 a 18hs, hora Argentina). Usalo antes de proponerle un horario a la persona.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Fecha a revisar, formato YYYY-MM-DD.',
        },
        duration_minutes: {
          type: 'number',
          description: 'Duración estimada de la llamada en minutos. Default 30.',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'schedule_call',
    description:
      'Crea el evento en el calendario real. Usalo solo después de que la persona confirmó un día y hora concretos.',
    input_schema: {
      type: 'object',
      properties: {
        start_datetime: {
          type: 'string',
          description: 'Fecha y hora de inicio confirmadas, formato ISO 8601 sin zona horaria, ej. 2026-09-15T15:00:00.',
        },
        duration_minutes: {
          type: 'number',
          description: 'Duración en minutos. Default 30.',
        },
        customer_name: {
          type: 'string',
          description: 'Nombre o usuario de Instagram de la persona con la que se agenda.',
        },
        notes: {
          type: 'string',
          description: 'Breve resumen de qué necesita, para referencia.',
        },
      },
      required: ['start_datetime', 'customer_name'],
    },
  },
];

async function runTool(name: string, input: any): Promise<{ content: string; isError: boolean }> {
  try {
    if (name === 'check_availability') {
      const slots = await findFreeSlots(input.date, input.duration_minutes ?? 30);
      if (slots.length === 0) {
        return { content: 'No hay horarios libres ese día en horario laboral. Proponé otro día.', isError: false };
      }
      return { content: `Horarios libres (ISO, hora Argentina): ${slots.join(', ')}`, isError: false };
    }
    if (name === 'schedule_call') {
      const event = await createCalendarEvent({
        startDatetime: input.start_datetime,
        durationMinutes: input.duration_minutes ?? 30,
        customerName: input.customer_name,
        notes: input.notes,
      });
      return { content: `Evento creado correctamente. id=${event.id ?? 'desconocido'}`, isError: false };
    }
    return { content: `Herramienta desconocida: ${name}`, isError: true };
  } catch (err) {
    return { content: `Error al ejecutar ${name}: ${(err as Error).message}`, isError: true };
  }
}

export async function generateReply(history: IgMessage[], myAccountId: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.text)
    .map((m) => ({
      role: m.fromId === myAccountId ? 'assistant' : 'user',
      content: m.text,
    }));

  // La API requiere que la conversación empiece con un mensaje del usuario.
  while (messages.length && messages[0].role !== 'user') {
    messages.shift();
  }
  if (messages.length === 0) return '';

  const systemPrompt = buildSystemPrompt();
  let usedTools = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: systemPrompt,
        tools,
        messages,
      });
    } catch (err) {
      // Si esto falla DESPUÉS de haber ejecutado una herramienta con efectos
      // reales (ej. ya se creó el turno en el calendario), no podemos dejar
      // que la excepción se propague: en index.ts eso haría que el mensaje
      // se reprocese desde cero en la próxima vuelta y podría duplicar la
      // acción. Devolvemos una respuesta de fallback en su lugar.
      console.error('Error llamando a la API de Anthropic:', (err as Error).message);
      return usedTools
        ? 'Listo, quedó registrado. Cualquier cosa confirmámelo de nuevo por acá.'
        : 'Perdón, tuve un problema para responder. ¿Me lo podés repetir?';
    }

    if (response.stop_reason !== 'tool_use') {
      const block = response.content.find((b) => b.type === 'text');
      return block && block.type === 'text' ? block.text.trim() : '';
    }

    usedTools = true;
    messages.push({ role: 'assistant', content: response.content });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const { content, isError } = await runTool(block.name, block.input);
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content,
          is_error: isError,
        };
      })
    );

    messages.push({ role: 'user', content: toolResults });
  }

  return usedTools
    ? 'Listo, quedó registrado. Cualquier cosa confirmámelo de nuevo por acá.'
    : 'Perdón, se me complicó procesar eso. ¿Podés reformularlo?';
}
