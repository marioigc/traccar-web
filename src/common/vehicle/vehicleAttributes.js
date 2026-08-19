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
export const COLOR_UNKNOWN = '#555b66';

export const COLOR_LIGHT_LOW = '#fff4d6';
export const COLOR_LIGHT_POSITION = '#ffb84d';
export const COLOR_LIGHT_FOG = '#ff8c3d';
export const COLOR_LIGHT_OFF = '#3a3f4a';

// Los estados de apertura llegan como string desde los Atributos Computados, y
// NO usan el mismo género: las puertas son "Abierta"/"Cerrada" y el maletero es
// "Abierto"/"Cerrado". Se aceptan ambos, más el booleano por si un dispositivo
// futuro lo reporta así.
export const isOpen = (value) => value === true || value === 'Abierta' || value === 'Abierto';

// Un voltaje de 0 no es una medición válida: es lo que reporta el equipo cuando
// no está leyendo el bus del vehículo (verificado en Furgón 1 con el motor
// apagado). Se descarta para no mostrar "0.00 V" como si fuera un dato real.
const validVoltage = (value) => (typeof value === 'number' && value > 0 ? value : undefined);

export const getVehicleStatus = (position, device) => {
  const a = position?.attributes || {};

  return {
    patente: device?.attributes?.patente,

    kmReal: a.kmReal,
    rpm: a.rpmReal,
    tempMotor: a.tempRefrigerante,
    combustiblePct: a.combustiblePct,
    combustibleLitros: a.combustibleLitros,
    voltajeVehiculo: validVoltage(a.bateriaVehiculo),
    frenoMano: a.frenoMano,

    puertaChofer: a.puertaDelIzq,
    puertaCopiloto: a.puertaDelDer,
    puertaLateral: a.puertaTrasDer,
    maletero: a.maletero,

    cinturonChofer: a.cinturonDelIzq,
    cinturonCopiloto: a.cinturonDelDer,

    luzPosicion: a.luzPosicion,
    luzBaja: a.luzBaja,
    luzNiebla: a.luzNiebla,
  };
};
