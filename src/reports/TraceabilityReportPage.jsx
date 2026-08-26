import { useState } from 'react';
import {
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { formatBoolean, formatNotificationTitle, formatTime } from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ResizeHandle from './components/ResizeHandle';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { useCatch, useCatchCallback } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapPositions from '../map/MapPositions';
import MapCamera from '../map/MapCamera';
import MapScale from '../map/MapScale';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';
import { deviceEquality } from '../common/util/deviceEquality';

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

// De los atributos de arriba, cuáles cuentan como "puerta" para medir la
// demora detención → apertura del resumen. El maletero queda afuera: se abre
// para cargar herramientas, no marca que el técnico bajó a trabajar.
const DOOR_ATTRIBUTES = ['puertaDelIzq', 'puertaDelDer', 'puertaTrasDer'];
const DOOR_CLOSED_VALUE = 'Cerrada';
const DOOR_OPEN_VALUE = 'Abierta';

// Duración mínima (minutos) para que una detención cuente en el resumen.
// Sin este piso, paradas de semáforo o tráfico con algún cambio de puerta
// coincidente (p.ej. un pasajero) ensucian la mediana. Verificado contra
// 8.208 posiciones reales del Furgón 2 (3 días): con 10 min la mediana
// calculada (≈18,6 min) queda muy cerca de la validada a mano por el dueño
// (18,2 min, casos de hasta 24). Es un criterio nuestro, no algo confirmado
// por el dueño — si su propio cálculo usó otro criterio, ajustar acá.
const MIN_STOP_DURATION_MINUTES = 10;

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

// Arma los segmentos de detención a partir de attributes.motion (el mismo
// campo que ya usa Traccar para deviceStopped/deviceMoving) y, para cada uno,
// busca el momento de la primera apertura de puerta.
const deriveStops = (positions) => {
  const stops = [];
  let current = null;
  let lastMotion = null;
  const lastDoorValue = {};

  positions.forEach((position) => {
    const attributes = position.attributes || {};
    const motion = attributes.motion;

    if (typeof motion === 'boolean') {
      if (motion === false && lastMotion !== false) {
        current = { stopStart: position.fixTime, stopEnd: null, doorOpenTime: null };
      } else if (motion === true && lastMotion === false && current) {
        current.stopEnd = position.fixTime;
        stops.push(current);
        current = null;
      }
      lastMotion = motion;
    }

    if (current && !current.doorOpenTime) {
      DOOR_ATTRIBUTES.forEach((key) => {
        if (current.doorOpenTime) {
          return;
        }
        if (key in attributes) {
          const value = attributes[key];
          if (lastDoorValue[key] === DOOR_CLOSED_VALUE && value === DOOR_OPEN_VALUE) {
            current.doorOpenTime = position.fixTime;
          }
        }
      });
    }
    DOOR_ATTRIBUTES.forEach((key) => {
      if (key in attributes) {
        lastDoorValue[key] = attributes[key];
      }
    });
  });
  if (current) {
    current.stopEnd = positions[positions.length - 1]?.fixTime || current.stopStart;
    stops.push(current);
  }
  return stops;
};

// Resumen del período: mediana de minutos entre detención y primera apertura
// de puerta. Se excluyen detenciones sin apertura de puerta (semáforos,
// tráfico) y detenciones breves (ver MIN_STOP_DURATION_MINUTES).
export const summarizeStopDoorDelays = (positions) => {
  const stops = deriveStops(positions);
  const delays = stops
    .filter((stop) => stop.doorOpenTime)
    .filter(
      (stop) =>
        (new Date(stop.stopEnd) - new Date(stop.stopStart)) / 60000 >= MIN_STOP_DURATION_MINUTES,
    )
    .map((stop) => (new Date(stop.doorOpenTime) - new Date(stop.stopStart)) / 60000);

  if (!delays.length) {
    return { count: 0, medianMinutes: null };
  }
  const sorted = [...delays].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMinutes = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { count: delays.length, medianMinutes };
};

const TraceabilityReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const positionAttributes = usePositionAttributes(t);

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ count: 0, medianMinutes: null });
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const describeAttributeValue = (value) => {
    if (typeof value === 'boolean') {
      return formatBoolean(value, t);
    }
    return value == null ? '—' : value;
  };

  const describeItem = (item) => {
    if (item.kind === 'event') {
      return formatNotificationTitle(t, {
        type: item.event.type,
        attributes: { alarms: item.event.attributes?.alarm },
      });
    }
    const label = positionAttributes[item.change.key]?.name || item.change.key;
    return (
      `${label}: ${describeAttributeValue(item.change.from)} ` +
      `→ ${describeAttributeValue(item.change.to)}`
    );
  };

  const onShow = useCatchCallback(async ({ deviceIds, from, to }) => {
    const [deviceId] = deviceIds;
    setSelectedItem(null);
    setLoading(true);
    try {
      const query = new URLSearchParams({ from, to });
      if (deviceId) {
        query.append('deviceId', deviceId);
      }
      const [eventsResponse, routeResponse] = await Promise.all([
        fetchOrThrow(`/api/reports/events?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/route?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
      ]);
      const [events, positions] = await Promise.all([eventsResponse.json(), routeResponse.json()]);

      const positionsById = {};
      positions.forEach((position) => {
        positionsById[position.id] = position;
      });

      const eventItems = events.map((event) => ({
        id: `event-${event.id}`,
        time: event.eventTime,
        kind: 'event',
        event,
        position: positionsById[event.positionId] || null,
      }));

      const attributeItems = deriveAttributeChanges(positions).map((change) => ({
        id: change.id,
        time: change.time,
        kind: 'attribute',
        change,
        position: change.position,
      }));

      const timeline = [...eventItems, ...attributeItems].sort(
        (a, b) => new Date(a.time) - new Date(b.time),
      );

      setItems(timeline);
      setSummary(summarizeStopDoorDelays(positions));
    } finally {
      setLoading(false);
    }
  }, []);

  const onExport = useCatch(async ({ deviceIds }) => {
    const [deviceId] = deviceIds;
    const deviceName = devices[deviceId]?.name || t('reportTraceability');
    const sheets = new Map();
    sheets.set(
      deviceName,
      items.map((item) => ({
        [t('positionFixTime')]: formatTime(item.time, 'seconds'),
        [t('sharedDescription')]: describeItem(item),
      })),
    );
    await exportExcel(t('reportTraceability'), 'traceability.xlsx', sheets, theme);
  });

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportTraceability']}>
      <div className={classes.container}>
        {selectedItem?.position && (
          <>
            <div className={classes.containerMap}>
              <MapView>
                <MapGeofence />
                <MapPositions positions={[selectedItem.position]} titleField="fixTime" />
              </MapView>
              <MapScale />
              <MapCamera
                latitude={selectedItem.position.latitude}
                longitude={selectedItem.position.longitude}
              />
            </div>
            <ResizeHandle />
          </>
        )}
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter
              onShow={onShow}
              onExport={onExport}
              deviceType="single"
              loading={loading}
              formats={['xlsx']}
            />
            <Alert severity="info" sx={{ mx: 2, mb: 2 }}>
              Los rangos de varios días son lentos: un día del furgón son miles de posiciones
              (~3.000, 5 MB) y puede tardar decenas de segundos en cargar. Preferí rangos cortos
              cuando puedas.
            </Alert>
            {!loading && items.length > 0 && (
              <Typography variant="body2" sx={{ mx: 2, mb: 2 }}>
                {summary.medianMinutes !== null
                  ? `Demora mediana entre detención y apertura de puerta: ` +
                    `${summary.medianMinutes.toFixed(1)} min (sobre ${summary.count} detenciones ` +
                    `con apertura de puerta; se excluyen detenciones sin apertura y paradas de ` +
                    `menos de ${MIN_STOP_DURATION_MINUTES} minutos).`
                  : 'No se registraron detenciones con apertura de puerta en el período seleccionado.'}
              </Typography>
            )}
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                <TableCell>{t('positionFixTime')}</TableCell>
                <TableCell>{t('sharedDescription')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className={classes.columnAction} padding="none">
                      {item.position &&
                        (selectedItem === item ? (
                          <IconButton size="small" onClick={() => setSelectedItem(null)}>
                            <GpsFixedIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton size="small" onClick={() => setSelectedItem(item)}>
                            <LocationSearchingIcon fontSize="small" />
                          </IconButton>
                        ))}
                    </TableCell>
                    <TableCell>{formatTime(item.time, 'seconds')}</TableCell>
                    <TableCell>{describeItem(item)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableShimmer columns={3} startAction />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default TraceabilityReportPage;
