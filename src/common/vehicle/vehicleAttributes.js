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
  if (ignition === undefined) return undefined;
  if (ignition !== true) return 'apagado';
  const girando =
    (typeof rpm === 'number' && rpm > 0) ||
    (typeof voltaje === 'number' && voltaje >= VOLTAJE_ALTERNADOR);
  return girando ? 'andando' : 'contacto';
};

export const getVehicleStatus = (position, device) => {
  const a = position?.attributes || {};

  return {
    patente: device?.attributes?.patente,

    kmReal: num(a.kmReal),
    rpm: num(a.rpmReal),
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
