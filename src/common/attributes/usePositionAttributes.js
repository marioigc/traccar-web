import { useMemo } from 'react';

export default (t) =>
  useMemo(
    () => ({
      id: {
        name: t('deviceIdentifier'),
        type: 'number',
        property: true,
      },
      latitude: {
        name: t('positionLatitude'),
        type: 'number',
        property: true,
      },
      longitude: {
        name: t('positionLongitude'),
        type: 'number',
        property: true,
      },
      speed: {
        name: t('positionSpeed'),
        type: 'number',
        dataType: 'speed',
        property: true,
      },
      course: {
        name: t('positionCourse'),
        type: 'number',
        property: true,
      },
      altitude: {
        name: t('positionAltitude'),
        type: 'number',
        property: true,
      },
      accuracy: {
        name: t('positionAccuracy'),
        type: 'number',
        dataType: 'distance',
        property: true,
      },
      valid: {
        name: t('positionValid'),
        type: 'boolean',
        property: true,
      },
      protocol: {
        name: t('positionProtocol'),
        type: 'string',
        property: true,
      },
      address: {
        name: t('positionAddress'),
        type: 'string',
        property: true,
      },
      deviceTime: {
        name: t('positionDeviceTime'),
        type: 'string',
        property: true,
      },
      fixTime: {
        name: t('positionFixTime'),
        type: 'string',
        property: true,
      },
      serverTime: {
        name: t('positionServerTime'),
        type: 'string',
        property: true,
      },
      geofenceIds: {
        name: t('sharedGeofences'),
        property: true,
      },
      raw: {
        name: t('positionRaw'),
        type: 'string',
      },
      index: {
        name: t('positionIndex'),
        type: 'number',
      },
      hdop: {
        name: t('positionHdop'),
        type: 'number',
      },
      vdop: {
        name: t('positionVdop'),
        type: 'number',
      },
      pdop: {
        name: t('positionPdop'),
        type: 'number',
      },
      sat: {
        name: t('positionSat'),
        type: 'number',
      },
      satVisible: {
        name: t('positionSatVisible'),
        type: 'number',
      },
      rssi: {
        name: t('positionRssi'),
        type: 'number',
      },
      coolantTemp: {
        name: t('positionCoolantTemp'),
        type: 'number',
      },
      engineTemp: {
        name: t('positionEngineTemp'),
        type: 'number',
      },
      gps: {
        name: t('positionGps'),
        type: 'number',
      },
      roaming: {
        name: t('positionRoaming'),
        type: 'boolean',
      },
      event: {
        name: t('positionEvent'),
        type: 'string',
      },
      alarm: {
        name: t('positionAlarm'),
        type: 'string',
      },
      status: {
        name: t('positionStatus'),
        type: 'string',
      },
      odometer: {
        name: t('positionOdometer'),
        type: 'number',
        dataType: 'distance',
      },
      serviceOdometer: {
        name: t('positionServiceOdometer'),
        type: 'number',
        dataType: 'distance',
      },
      tripOdometer: {
        name: t('positionTripOdometer'),
        type: 'number',
        dataType: 'distance',
      },
      hours: {
        name: t('positionHours'),
        type: 'number',
        dataType: 'hours',
      },
      steps: {
        name: t('positionSteps'),
        type: 'number',
      },
      heartRate: {
        name: t('positionHeartRate'),
        type: 'number',
      },
      input: {
        name: t('positionInput'),
        type: 'number',
      },
      in1: {
        name: `${t('positionInput')} 1`,
        type: 'boolean',
      },
      in2: {
        name: `${t('positionInput')} 2`,
        type: 'boolean',
      },
      in3: {
        name: `${t('positionInput')} 3`,
        type: 'boolean',
      },
      in4: {
        name: `${t('positionInput')} 4`,
        type: 'boolean',
      },
      output: {
        name: t('positionOutput'),
        type: 'number',
      },
      out1: {
        name: `${t('positionOutput')} 1`,
        type: 'boolean',
      },
      out2: {
        name: `${t('positionOutput')} 2`,
        type: 'boolean',
      },
      out3: {
        name: `${t('positionOutput')} 3`,
        type: 'boolean',
      },
      out4: {
        name: `${t('positionOutput')} 4`,
        type: 'boolean',
      },
      power: {
        name: t('positionPower'),
        type: 'number',
        dataType: 'voltage',
      },
      battery: {
        name: t('positionBattery'),
        type: 'number',
        dataType: 'voltage',
      },
      batteryLevel: {
        name: t('positionBatteryLevel'),
        type: 'number',
        dataType: 'percentage',
      },
      fuel: {
        name: t('positionFuel'),
        type: 'number',
        dataType: 'volume',
      },
      fuelUsed: {
        name: t('positionFuelUsed'),
        type: 'number',
      },
      fuelConsumption: {
        name: t('positionFuelConsumption'),
        type: 'number',
      },
      versionFw: {
        name: t('positionVersionFw'),
        type: 'string',
      },
      versionHw: {
        name: t('positionVersionHw'),
        type: 'string',
      },
      type: {
        name: t('sharedType'),
        type: 'string',
      },
      ignition: {
        name: t('positionIgnition'),
        type: 'boolean',
      },
      flags: {
        name: t('positionFlags'),
        type: 'string',
      },
      charge: {
        name: t('positionCharge'),
        type: 'boolean',
      },
      ip: {
        name: t('positionIp'),
        type: 'string',
      },
      archive: {
        name: t('positionArchive'),
        type: 'boolean',
      },
      distance: {
        name: t('positionDistance'),
        type: 'number',
        dataType: 'distance',
      },
      totalDistance: {
        name: t('deviceTotalDistance'),
        type: 'number',
        dataType: 'distance',
      },
      rpm: {
        name: t('positionRpm'),
        type: 'number',
      },
      vin: {
        name: t('positionVin'),
        type: 'string',
      },
      approximate: {
        name: t('positionApproximate'),
        type: 'boolean',
      },
      throttle: {
        name: t('positionThrottle'),
        type: 'number',
      },
      motion: {
        name: t('positionMotion'),
        type: 'boolean',
      },
      armed: {
        name: t('positionArmed'),
        type: 'boolean',
      },
      geofence: {
        name: t('sharedGeofence'),
        type: 'string',
      },
      acceleration: {
        name: t('positionAcceleration'),
        type: 'number',
      },
      humidity: {
        name: t('positionHumidity'),
        type: 'number',
      },
      deviceTemp: {
        name: t('positionDeviceTemp'),
        type: 'number',
      },
      temp1: {
        name: `${t('positionTemp')} 1`,
        type: 'number',
      },
      temp2: {
        name: `${t('positionTemp')} 2`,
        type: 'number',
      },
      temp3: {
        name: `${t('positionTemp')} 3`,
        type: 'number',
      },
      temp4: {
        name: `${t('positionTemp')} 4`,
        type: 'number',
      },
      operator: {
        name: t('positionOperator'),
        type: 'string',
      },
      command: {
        name: t('deviceCommand'),
        type: 'string',
      },
      blocked: {
        name: t('positionBlocked'),
        type: 'boolean',
      },
      lock: {
        name: t('alarmLock'),
        type: 'boolean',
      },
      dtcs: {
        name: t('positionDtcs'),
        type: 'string',
      },
      obdSpeed: {
        name: t('positionObdSpeed'),
        type: 'number',
        dataType: 'speed',
      },
      obdOdometer: {
        name: t('positionObdOdometer'),
        type: 'number',
        dataType: 'distance',
      },
      result: {
        name: t('eventCommandResult'),
        type: 'string',
      },
      driverUniqueId: {
        name: t('sharedDriver'),
        type: 'string',
      },
      card: {
        name: t('positionCard'),
        type: 'string',
      },
      drivingTime: {
        name: t('positionDrivingTime'),
        type: 'number',
        dataType: 'hours',
      },
      color: {
        name: t('attributeColor'),
        type: 'string',
      },
      image: {
        name: t('positionImage'),
        type: 'string',
      },
      video: {
        name: t('positionVideo'),
        type: 'string',
      },
      audio: {
        name: t('positionAudio'),
        type: 'string',
      },
      speedLimit: {
        name: t('attributeSpeedLimit'),
        type: 'number',
        dataType: 'speed',
      },

      // ── Atributos Computados de SETEL ──────────────────────────────────────
      // Son los que traducen los io### crudos del equipo a datos con significado.
      // Sin estas definiciones los reportes los listan con la clave cruda
      // ("kmReal", "puertaTrasDer"), porque Traccar solo conoce los suyos.
      // Los nombres van como literales en español: la app es español-only para
      // SETEL, y una clave de traducción que solo exista en es.json saldría en
      // blanco en cualquier otro idioma (el proveedor no tiene fallback).
      //
      // Sobre `dataType`: solo se pone cuando la unidad del dato coincide con lo
      // que espera el formateador. `distance` convierte desde METROS y `speed`
      // desde NUDOS, así que ponerlos donde el dato ya viene en km o km/h daría
      // un número mal convertido — peor que un número sin unidad.

      kmReal: {
        // Ya viene en kilómetros, no en metros: sin dataType 'distance', que
        // convertiría desde metros y mostraría 100 km como 0,1 km.
        name: 'Kilometraje real (km)',
        type: 'number',
      },
      kmDesdeInstalacion: {
        name: 'Kilometraje desde instalación (km)',
        type: 'number',
      },
      combustiblePct: {
        name: 'Combustible (%)',
        type: 'number',
        dataType: 'percentage',
      },
      combustibleLitros: {
        name: 'Combustible (litros)',
        type: 'number',
        dataType: 'volume',
      },
      combustibleConsumido: {
        name: 'Combustible consumido (litros)',
        type: 'number',
        dataType: 'volume',
      },
      rpmReal: {
        name: 'RPM del motor',
        type: 'number',
      },
      velocidadReal: {
        // Bug confirmado de escala (~1,85x) en el perfil CAN de este vehículo.
        // Se deja visible pero rotulado, en vez de ocultarlo: alguien que lo
        // seleccione en un reporte tiene que saber que no puede confiar en él.
        // Tampoco lleva dataType 'speed', que convertiría desde nudos.
        name: 'Velocidad CAN (no confiable, ver docs)',
        type: 'number',
      },
      tempRefrigerante: {
        // No hay dataType de temperatura; la unidad va en el nombre.
        name: 'Temperatura del refrigerante (°C)',
        type: 'number',
      },
      posicionAcelerador: {
        name: 'Pedal del acelerador (%)',
        type: 'number',
        dataType: 'percentage',
      },
      anguloVolante: {
        name: 'Ángulo del volante (°)',
        type: 'number',
      },
      bateriaVehiculo: {
        name: 'Voltaje del vehículo',
        type: 'number',
        dataType: 'voltage',
      },
      bateriaGps: {
        name: 'Batería del equipo GPS',
        type: 'number',
        dataType: 'voltage',
      },

      frenoMano: {
        name: 'Freno de mano',
        type: 'string',
      },
      frenoPisado: {
        name: 'Freno pisado',
        type: 'boolean',
      },
      embraguePisado: {
        name: 'Embrague pisado',
        type: 'boolean',
      },
      controlCrucero: {
        name: 'Control crucero',
        type: 'boolean',
      },
      aireAcondicionado: {
        name: 'Aire acondicionado',
        type: 'boolean',
      },

      // Nombres por posición en el vehículo, no por el lado del que vienen en el
      // bus: "Puerta lateral derecha" es lo que el usuario ve en el furgón.
      puertaDelIzq: {
        name: 'Puerta del chofer',
        type: 'string',
      },
      puertaDelDer: {
        name: 'Puerta del copiloto',
        type: 'string',
      },
      puertaTrasDer: {
        name: 'Puerta lateral derecha',
        type: 'string',
      },
      puertaTrasIzq: {
        name: 'Puerta trasera izquierda',
        type: 'string',
      },
      maletero: {
        name: 'Maletero',
        type: 'string',
      },
      cinturonDelIzq: {
        name: 'Cinturón del chofer',
        type: 'boolean',
      },
      cinturonDelDer: {
        name: 'Cinturón del copiloto',
        type: 'boolean',
      },

      lucesEncendidas: {
        name: 'Luces encendidas',
        type: 'boolean',
      },
      luzPosicion: {
        name: 'Luz de posición',
        type: 'boolean',
      },
      luzBaja: {
        name: 'Luz baja',
        type: 'boolean',
      },
      luzNiebla: {
        name: 'Luz antiniebla',
        type: 'boolean',
      },
      intermitenteIzq: {
        name: 'Intermitente izquierdo',
        type: 'boolean',
      },
      intermitenteDer: {
        name: 'Intermitente derecho',
        type: 'boolean',
      },
    }),
    [t],
  );
