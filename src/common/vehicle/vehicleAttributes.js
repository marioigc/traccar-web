// src/common/vehicle/vehicleAttributes.js
//
// Traduce los atributos de una posición de Traccar — ya normalizados por los
// Atributos Computados que se configuran por dispositivo en el backend — a un
// objeto plano. El resto del módulo lee de aquí y nunca necesita saber qué
// io### usa cada modelo de GPS ni qué modelo está conectado.
//
// Si un dispositivo no reporta un campo (otro modelo de equipo, o el vehículo
// no lo tiene), el valor queda `undefined` y los componentes ocultan esa parte
// en vez de mostrar un cero falso.

import { speedToKnots } from '../util/converter';

export const COLOR_OK = '#5fd67f';
export const COLOR_ALERT = '#e05a5a';
export const COLOR_UNKNOWN = '#9098a8';
export const COLOR_INFO = '#5fa8ff';

export const COLOR_LIGHT_LOW = '#fff4d6';
export const COLOR_LIGHT_POSITION = '#ffb84d';
export const COLOR_LIGHT_FOG = '#ff8c3d';
export const COLOR_TURN = '#ffa41f';
export const COLOR_LIGHT_OFF = '#3a3f4a';

// Los estados de apertura llegan como string desde los Atributos Computados, y
// NO usan el mismo género: las puertas son "Abierta"/"Cerrada" y el maletero es
// "Abierto"/"Cerrado". Se aceptan ambos, más el booleano por si un dispositivo
// futuro lo reporta así. Igual que bool()/parkingBrake(), cualquier otro valor
// (null, objeto, string atípico de un modelo de GPS nuevo) queda `undefined`
// en vez de afirmar "cerrada" sobre una puerta de la que no hay dato.
const doorState = (value) => {
  if (value === true || value === 'Abierta' || value === 'Abierto') return true;
  if (value === false || value === 'Cerrada' || value === 'Cerrado') return false;
  return undefined;
};

// Un voltaje de 0 no es una medición válida: es lo que reporta el equipo cuando
// no está leyendo el bus del vehículo (verificado en Furgón 1 con el motor
// apagado). Se descarta para no mostrar "0.00 V" como si fuera un dato real.
const validVoltage = (value) => (typeof value === 'number' && value > 0 ? value : undefined);

// Los atributos numéricos pueden llegar como `null` (equipo que reporta el
// campo pero sin lectura) o como string, no solo `undefined` (campo ausente).
// `formatNumber`/`formatTemperature` hacen `.toFixed()` directo y lanzan
// TypeError con cualquiera de esos dos casos, y el ErrorBoundary de la app
// reemplaza toda la pantalla, no solo el modal. Se normaliza aquí, en la capa
// de datos, para que cualquier consumidor de `getVehicleStatus` — no solo
// este modal — reciba siempre un número válido o `undefined`.
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

// Los campos booleanos (cinturones, luces) pueden llegar como string
// ("true"/"false") o número (0/1) si un Atributo Computado nuevo queda mal
// tipado en el backend al instalar un GPS. Sin este blindaje, VanDiagram.jsx
// hace `value ? A : B`, y el string "false" es truthy en JavaScript: pintaría
// un cinturón suelto de verde o una luz apagada como encendida. Igual que
// num(), cualquier valor no reconocido queda `undefined` en vez de afirmar un
// estado falso.
const bool = (value) => {
  if (value === true || value === 'true' || value === 1) return true;
  if (value === false || value === 'false' || value === 0) return false;
  return undefined;
};

// El freno de mano es el único campo de texto libre: Traccar lo entrega como
// string ('Activo'/'Liberado'), pero se admite también el booleano por si un
// equipo futuro lo reporta así. Cualquier otro valor (null, string vacío,
// número) queda `undefined` en vez de imprimirse literal en pantalla.
const parkingBrake = (value) => {
  if (typeof value === 'string' && value !== '') return value;
  if (value === true) return 'Activo';
  if (value === false) return 'Liberado';
  return undefined;
};

// El motor tiene TRES estados, no dos. `ignition` solo dice si hay contacto: con
// la llave girada pero sin arrancar, `ignition` ya vale 1 y el motor está quieto.
// Distinguirlos necesita una segunda señal:
//   - RPM sobre cero: el motor gira. Es la prueba directa, cuando el equipo lee CAN.
//   - Voltaje sobre ~13.2 V: el alternador está cargando, o sea el motor gira.
//     Sirve para equipos que no reportan RPM (el FMC920 con dongle OBD2, por ejemplo).
// Medido en el Furgón 2: 12.36 V solo con contacto, 13.54 V con el motor andando.
// El umbral queda cómodo entre ambos.
//
// Si hay contacto pero ninguna de las dos señales lo confirma, se devuelve
// 'contacto' — que es literalmente lo único que el dato prueba. Afirmar "andando"
// sin evidencia sería inventar.
export const VOLTAJE_ALTERNADOR = 13.2;

export const getEngineState = (ignition, rpm, voltaje) => {
  // `ignition === false` es AUTORITATIVO: el motor está apagado.
  //
  // Se puede ver una posición con la ignición en 0 y las RPM todavía sobre cero,
  // pero es el instante de la transición, no un motor andando. Verificado sobre
  // las 8.092 posiciones del Furgón Ploteado, en los 25 casos que lo presentan:
  //   - 22 de 25 son la primera posición justo después de apagar.
  //   - 25 de 25 llegan a 0 RPM poco después (mediana 5 s).
  //   - 0 de 25 sostienen RPM > 0 en posiciones sucesivas. Si fuera un motor
  //     realmente andando con la señal mal configurada, aguantaría varias.
  //   - 17 de 25 traen además una caída de temperatura de más de 20 °C de golpe
  //     (90 → 64,8 → 20 °C en nueve segundos), que es físicamente imposible:
  //     son lecturas del CAN volviéndose inválidas mientras el bus se apaga.
  //
  // Confiar en las RPM por sobre la ignición hacía que el modal mostrara "Motor
  // andando" durante esos segundos de apagado.
  if (ignition === false) return 'apagado';

  if (ignition === true) {
    const girando =
      (typeof rpm === 'number' && rpm > 0) ||
      (typeof voltaje === 'number' && voltaje >= VOLTAJE_ALTERNADOR);
    return girando ? 'andando' : 'contacto';
  }

  // Sin dato de ignición (un equipo que no la reporta), lo único que queda es la
  // evidencia física. Solo se afirma "andando" si el motor demostrablemente gira;
  // en cualquier otro caso no se muestra estado en vez de inventar uno.
  const girandoSinIgnicion =
    (typeof rpm === 'number' && rpm > 0) ||
    (typeof voltaje === 'number' && voltaje >= VOLTAJE_ALTERNADOR);
  return girandoSinIgnicion ? 'andando' : undefined;
};

// Decisión del dueño de SETEL, textual: "si tiene CAN se usa la del CAN, si
// no tiene CAN se usa la del GPS". Se resuelve UNA sola vez, acá, para que
// ninguna pantalla reparta por su cuenta la lógica de "¿este equipo tiene
// CAN?" — todas consumen el resultado ya decidido.
//
// `velocidadReal` (io81) viene en KM/H; `position.speed` (GPS, estándar
// Traccar) viene en NUDOS. Se devuelve siempre en NUDOS —la unidad que espera
// `formatSpeed`— para que ningún consumidor tenga que acordarse de convertir.
// El bug de escala (~1,85x) que tenía el perfil CAN está corregido: perfil
// nuevo cargado en el equipo, verificado contra 5.339 muestras reales en
// movimiento (factor CAN/GPS con mediana 1.000).
//
// No todos los equipos reportan CAN (el FURGON_1 no tiene ningún atributo
// CAN): `num()` descarta `undefined`, `null` y strings, así que la ausencia
// del atributo cae directo al GPS en vez de fallar o mostrar un cero falso.
export const VELOCIDAD_FUENTE_LABELS = {
  can: 'CAN',
  gps: 'GPS',
};

const vehicleSpeed = (position, attributes) => {
  const canSpeedKmh = num(attributes.velocidadReal);
  if (canSpeedKmh !== undefined) {
    return { velocidadNudos: speedToKnots(canSpeedKmh, 'kmh'), velocidadFuente: 'can' };
  }
  const gpsSpeedNudos = num(position?.speed);
  if (gpsSpeedNudos !== undefined) {
    return { velocidadNudos: gpsSpeedNudos, velocidadFuente: 'gps' };
  }
  return { velocidadNudos: undefined, velocidadFuente: undefined };
};

export const getVehicleStatus = (position, device) => {
  const a = position?.attributes || {};
  const { velocidadNudos, velocidadFuente } = vehicleSpeed(position, a);

  return {
    patente: device?.attributes?.patente,

    velocidadNudos,
    velocidadFuente,

    kmReal: num(a.kmReal),
    // Con el motor apagado las RPM son 0, punto. El equipo puede entregar un
    // valor decreciente en la posición justo posterior a girar la llave — el
    // motor muriendo, capturado por el reporte cada 5 s. Verificado en el Furgón
    // Ploteado el 28/08 a las 09:15:46: venía a 820 RPM constantes y esa única
    // posición trae 538 con la ignición ya en 0; cinco segundos después, 0.
    // Mostrar ese valor contradecía al propio badge de "Motor apagado".
    rpm: a.ignition === false && num(a.rpmReal) !== undefined ? 0 : num(a.rpmReal),
    tempMotor: num(a.tempRefrigerante),
    combustiblePct: num(a.combustiblePct),
    combustibleLitros: num(a.combustibleLitros),
    voltajeVehiculo: validVoltage(a.bateriaVehiculo),
    frenoMano: parkingBrake(a.frenoMano),

    puertaChofer: doorState(a.puertaDelIzq),
    puertaCopiloto: doorState(a.puertaDelDer),
    puertaLateral: doorState(a.puertaTrasDer),
    maletero: doorState(a.maletero),

    cinturonChofer: bool(a.cinturonDelIzq),
    cinturonCopiloto: bool(a.cinturonDelDer),

    luzPosicion: bool(a.luzPosicion),
    // Las mismas lámparas cumplen dos funciones: una sola parpadea al virar, y
    // las dos juntas cuando se pulsa el botón de emergencia. Por eso se leen por
    // separado y el diagrama decide cómo mostrarlo según cuántas estén activas.
    intermitenteIzq: bool(a.intermitenteIzq),
    intermitenteDer: bool(a.intermitenteDer),
    luzBaja: bool(a.luzBaja),
    luzNiebla: bool(a.luzNiebla),
  };
};
