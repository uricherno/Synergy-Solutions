import { execTool } from './composioClient.js';

export const TIMEZONE = 'America/Argentina/Buenos_Aires';
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const SLOT_STEP_MINUTES = 30;

type FreePeriod = { start: string; end: string };

type FindFreeSlotsResponse = {
  calendars?: Record<string, { free?: FreePeriod[]; busy?: FreePeriod[] }>;
};

type CreateEventResponse = {
  response_data?: { id?: string; htmlLink?: string };
};

/** Convierte una franja libre en horarios concretos de inicio, alineados cada 30 min, dentro del horario laboral. */
function sliceIntoSlots(period: FreePeriod, durationMinutes: number): string[] {
  const slots: string[] = [];
  const start = new Date(period.start);
  const end = new Date(period.end);

  const cursor = new Date(start);
  cursor.setSeconds(0, 0);
  // Redondea hacia arriba al próximo múltiplo de SLOT_STEP_MINUTES.
  const minutes = cursor.getMinutes();
  const rounded = Math.ceil(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  cursor.setMinutes(rounded);

  while (cursor.getTime() + durationMinutes * 60000 <= end.getTime()) {
    const hour = cursor.getHours();
    if (hour >= WORK_START_HOUR && hour < WORK_END_HOUR) {
      slots.push(cursor.toISOString());
    }
    cursor.setMinutes(cursor.getMinutes() + SLOT_STEP_MINUTES);
  }
  return slots;
}

/**
 * Busca horarios libres para un día puntual, dentro del horario laboral (9 a 18, hora Argentina).
 * `dateISO` en formato YYYY-MM-DD.
 */
export async function findFreeSlots(dateISO: string, durationMinutes = 30): Promise<string[]> {
  const raw = await execTool<FindFreeSlotsResponse>('GOOGLECALENDAR_FIND_FREE_SLOTS', {
    items: ['primary'],
    time_min: `${dateISO}T00:00:00`,
    time_max: `${dateISO}T23:59:59`,
    timezone: TIMEZONE,
  });

  const free = raw?.calendars?.primary?.free ?? [];
  const slots = free.flatMap((period) => sliceIntoSlots(period, durationMinutes));
  return slots.slice(0, 6);
}

export async function createCalendarEvent(params: {
  startDatetime: string;
  durationMinutes: number;
  customerName: string;
  notes?: string;
}): Promise<{ id?: string; htmlLink?: string }> {
  const hours = Math.floor(params.durationMinutes / 60);
  const minutes = params.durationMinutes % 60;

  const raw = await execTool<CreateEventResponse>('GOOGLECALENDAR_CREATE_EVENT', {
    start_datetime: params.startDatetime,
    event_duration_hour: hours,
    event_duration_minutes: minutes || 30,
    timezone: TIMEZONE,
    summary: `Llamada con ${params.customerName} (vía Instagram)`,
    description: params.notes ?? 'Agendado automáticamente por el asistente de Instagram.',
    create_meeting_room: true,
  });

  return {
    id: raw?.response_data?.id,
    htmlLink: raw?.response_data?.htmlLink,
  };
}
