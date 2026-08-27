import dayjs from 'dayjs';

// Lógica pura (sin React) para derivar la cronología de trazabilidad de un
// vehículo a partir de sus posiciones: cambios de puertas, cinturones y
// luces, y tramos de detención (motor apagado o ralentí prolongado). La usan
// tanto el reporte de Trazabilidad (TraceabilityReportPage) como el panel de
// Repetición de Ruta (ReplayPage): moverla a un solo lugar evita que las dos
// pantallas se desincronicen.

// Atributos SETEL a vigilar en /api/reports/route para armar la cronología de
// cambios de estado del vehículo (puertas, cinturones, luces, freno de mano).
// Lista fijada por el dueño de SETEL: no agregar ni quitar atributos sin que
// lo pida explícitamente.
const MONITORED_ATTRIBUTES = [
  'puertaDelIzq',
  'puertaDelDer',
  'puertaTrasDer',
  'maletero',
  'cinturonDelIzq',
  'cinturonDelDer',
  'luzPosicion',
  'luzBaja',
  'luzNiebla',
  'intermitenteIzq',
  'intermitenteDer',
  'frenoMano',
];

// Recorre las posiciones en orden y emite una fila cada vez que alguno de los
// MONITORED_ATTRIBUTES cambia respecto de la posición anterior. Si el
// atributo no viene informado en una posición se ignora esa posición para
// ese atributo (no cuenta como cambio ni corta la comparación).
export const deriveAttributeChanges = (positions) => {
  const changes = [];
  const lastKnown = {};
  positions.forEach((position) => {
    const attributes = position.attributes || {};
    MONITORED_ATTRIBUTES.forEach((key) => {
      if (!(key in attributes)) {
        return;
      }
      const value = attributes[key];
      if (key in lastKnown && lastKnown[key] !== value) {
        changes.push({
          id: `attr-${position.id}-${key}`,
          time: position.fixTime,
          key,
          from: lastKnown[key],
          to: value,
          position,
        });
      }
      lastKnown[key] = value;
    });
  });
  return changes;
};

// position.speed viene en NUDOS (estándar Traccar): hay que convertirlo a
// km/h antes de compararlo contra un umbral pensado en km/h.
const KNOTS_TO_KMH = 1.852;

// Por debajo de esto el vehículo se considera "quieto" aunque el flag
// attributes.motion todavía no haya bajado a false (motion tiene un retraso
// real de ~30-40 segundos respecto de la velocidad, confirmado contra datos
// reales del Furgón 2).
const QUIET_SPEED_KMH = 3;

// Un vehículo está "quieto" si el flag motion ya lo dice, o si la velocidad
// real ya está debajo del umbral aunque motion no se haya actualizado.
const isQuiet = (position) => {
  if (position.attributes?.motion === false) {
    return true;
  }
  return (position.speed || 0) * KNOTS_TO_KMH < QUIET_SPEED_KMH;
};

// Umbral de RPM bajo el cual, si el vehículo también está quieto, el motor
// cuenta como en ralentí. Definición del dueño, validada contra datos reales.
const IDLE_RPM_THRESHOLD = 1000;

// Minutos continuos en ralentí (quieto + bajo IDLE_RPM_THRESHOLD) para que el
// evento "vehículo detenido" aparezca en la cronología. Por debajo de esto es
// una parada de semáforo o de tráfico normal, no que el vehículo se detuvo.
const IDLE_STOP_MINUTES = 5;

// Minutos sin una posición nueva a partir de los cuales se asume que el
// equipo GPS estuvo dormido. No hay forma de saber qué pasó durante ese
// hueco, así que corta cualquier tramo de detención en curso en vez de
// asumir que siguió detenido (o moviéndose) todo ese tiempo.
const DEVICE_SLEEP_GAP_MINUTES = 10;

// Arma los tramos en que el vehículo estuvo "detenido": motor apagado (entra
// al tramo de inmediato), o quieto y en ralentí durante más de
// IDLE_STOP_MINUTES minutos seguidos (en ese caso el tramo se ancla al
// momento real en que empezó el ralentí, no a cuando se cumplieron los 5
// minutos). Un tramo abierto se cierra apenas el vehículo deja de estar
// quieto —eso es "retomó la marcha"—, sin importar si el motor sigue
// encendido o si el RPM tuvo algún pico momentáneo mientras seguía detenido.
export const deriveVehicleStops = (positions) => {
  const segments = [];
  let openSegment = null;
  let idleStreakStart = null;
  let idleStreakStartPosition = null;

  const closeSegment = (endTime, endPosition, closed) => {
    if (openSegment) {
      segments.push({ ...openSegment, end: endTime, endPosition, closed });
      openSegment = null;
    }
  };

  positions.forEach((position, index) => {
    const previous = positions[index - 1];
    if (previous) {
      const gapSeconds = (new Date(position.fixTime) - new Date(previous.fixTime)) / 1000;
      if (gapSeconds > DEVICE_SLEEP_GAP_MINUTES * 60) {
        closeSegment(previous.fixTime, previous, false);
        idleStreakStart = null;
        idleStreakStartPosition = null;
      }
    }

    const attributes = position.attributes || {};
    const quiet = isQuiet(position);

    if (openSegment) {
      if (!quiet) {
        closeSegment(position.fixTime, position, true);
        idleStreakStart = null;
        idleStreakStartPosition = null;
      }
      return;
    }

    if (attributes.ignition === false) {
      idleStreakStart = null;
      idleStreakStartPosition = null;
      openSegment = { start: position.fixTime, startPosition: position, reason: 'ignitionOff' };
      return;
    }

    const rpm = attributes.rpmReal;
    const lowRpm = typeof rpm === 'number' && rpm < IDLE_RPM_THRESHOLD;
    if (quiet && lowRpm) {
      if (idleStreakStart === null) {
        idleStreakStart = position.fixTime;
        idleStreakStartPosition = position;
      }
      const elapsedMinutes = (new Date(position.fixTime) - new Date(idleStreakStart)) / 60000;
      if (elapsedMinutes >= IDLE_STOP_MINUTES) {
        openSegment = {
          start: idleStreakStart,
          startPosition: idleStreakStartPosition,
          reason: 'idle',
        };
      }
    } else {
      idleStreakStart = null;
      idleStreakStartPosition = null;
    }
  });

  if (openSegment) {
    const last = positions[positions.length - 1];
    segments.push({
      ...openSegment,
      end: last?.fixTime || openSegment.start,
      endPosition: last,
      closed: false,
    });
  }

  return segments;
};

// Convierte los tramos de detención en filas de cronología: una al empezar
// el tramo (ya con la duración final, porque los tramos ya vienen cerrados)
// y, si el tramo terminó de verdad (no cortado por un hueco de datos ni
// todavía abierto al final del rango), otra indicando que retomó la marcha.
export const buildStopTimelineItems = (segments) =>
  segments.flatMap((segment, index) => {
    const durationMinutes = Math.round((new Date(segment.end) - new Date(segment.start)) / 60000);
    const startText =
      segment.reason === 'ignitionOff'
        ? 'Vehículo detenido (motor apagado).'
        : `Vehículo detenido (ralentí ${durationMinutes} min).`;
    const items = [
      {
        id: `stop-${index}-start`,
        time: segment.start,
        kind: 'stop',
        text: startText,
        position: segment.startPosition,
      },
    ];
    if (segment.closed) {
      items.push({
        id: `stop-${index}-end`,
        time: segment.end,
        kind: 'stop',
        text: 'El vehículo retomó la marcha.',
        position: segment.endPosition,
      });
    }
    return items;
  });

// Resumen diario: por cada día del rango consultado, cuánto tiempo el motor
// estuvo andando con el vehículo en movimiento y cuánto en ralentí (motor
// andando, vehículo quieto). No aplica el piso de IDLE_STOP_MINUTES: acá
// interesa el total real de ralentí, incluidas las paradas cortas de
// semáforo o tráfico, no solo las que califican como evento "detenido". Los
// huecos de más de DEVICE_SLEEP_GAP_MINUTES se descartan en vez de contarlos
// como ralentí, para no inflar el total con tiempo en que el equipo estuvo
// dormido. Validado contra 9.509 posiciones reales del Furgón 2 (4 días).
export const deriveDailyEngineSummary = (positions, from, to) => {
  const days = [];
  if (from && to) {
    let cursor = dayjs(from).startOf('day');
    const end = dayjs(to).startOf('day');
    while (!cursor.isAfter(end)) {
      days.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(1, 'day');
    }
  }
  const totals = new Map(days.map((day) => [day, { movingSeconds: 0, idleSeconds: 0 }]));

  for (let i = 1; i < positions.length; i += 1) {
    const previous = positions[i - 1];
    const current = positions[i];
    const deltaSeconds = (new Date(current.fixTime) - new Date(previous.fixTime)) / 1000;
    if (deltaSeconds <= 0 || deltaSeconds > DEVICE_SLEEP_GAP_MINUTES * 60) {
      continue;
    }
    if (previous.attributes?.ignition !== true) {
      continue;
    }
    const dayTotals = totals.get(dayjs(previous.fixTime).format('YYYY-MM-DD'));
    if (!dayTotals) {
      continue;
    }
    if (isQuiet(previous)) {
      dayTotals.idleSeconds += deltaSeconds;
    } else {
      dayTotals.movingSeconds += deltaSeconds;
    }
  }

  return days.map((day) => {
    const { movingSeconds, idleSeconds } = totals.get(day);
    const engineOnSeconds = movingSeconds + idleSeconds;
    return {
      day,
      movingSeconds,
      idleSeconds,
      idlePercent: engineOnSeconds > 0 ? (idleSeconds / engineOnSeconds) * 100 : null,
    };
  });
};

// Valores crudos que indican "abierto" para puertas y maletero. El equipo
// manda género distinto para cada uno ("Abierta" para puertas, "Abierto"
// para el maletero), así que no alcanza un solo valor.
const OPEN_STATE_VALUES = ['Abierta', 'Abierto'];

// Frases legibles para cada cambio de MONITORED_ATTRIBUTES, armadas a mano:
// los valores crudos ("Abierta"/"Cerrada", true/false) no se leen como un
// relato. label sale de usePositionAttributes (ya en español).
export const describeAttributeChange = (change, label) => {
  const { key, to } = change;
  const lowerLabel = label.toLowerCase();
  switch (key) {
    case 'puertaDelIzq':
    case 'puertaDelDer':
    case 'puertaTrasDer':
      return OPEN_STATE_VALUES.includes(to)
        ? `Se abrió la ${lowerLabel}`
        : `Se cerró la ${lowerLabel}`;
    case 'maletero':
      return OPEN_STATE_VALUES.includes(to)
        ? `Se abrió el ${lowerLabel}`
        : `Se cerró el ${lowerLabel}`;
    case 'cinturonDelIzq':
    case 'cinturonDelDer':
      return to === true ? `${label} abrochado` : `${label} desabrochado`;
    case 'luzPosicion':
    case 'luzBaja':
    case 'luzNiebla':
      return to === true ? `${label} encendida` : `${label} apagada`;
    case 'intermitenteIzq':
    case 'intermitenteDer':
      return to === true ? `${label} encendido` : `${label} apagado`;
    case 'frenoMano':
      return to === 'Activo' ? `${label} activado` : `${label} liberado`;
    default:
      return `${label}: ${change.from ?? '—'} → ${change.to ?? '—'}`;
  }
};
