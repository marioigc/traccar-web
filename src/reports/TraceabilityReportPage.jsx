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
import {
  formatNotificationTitle,
  formatNumericHours,
  formatPercentage,
  formatTime,
} from '../common/util/formatter';
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
import {
  deriveAttributeChanges,
  deriveVehicleStops,
  buildStopTimelineItems,
  deriveDailyEngineSummary,
  describeAttributeChange,
} from '../common/vehicle/traceability';

// Traducciones propias para las alarmas de conducción brusca que le importan
// al dueño (verificado en 7 días reales del Furgón 2: 36 hardAcceleration, 8
// hardCornering, 3 hardBraking). Cualquier otro tipo de alarma se muestra tal
// cual llega en vez de ocultarse.
const ALARM_NARRATIVES = {
  hardAcceleration: 'Acelerón brusco',
  hardBraking: 'Frenada brusca',
  hardCornering: 'Giro brusco',
};

// Texto de cronología para un evento de Traccar. El encendido/apagado del
// motor y las alarmas de conducción brusca tienen frase propia; el resto cae
// al título genérico que ya arma formatNotificationTitle.
const describeEvent = (event, t) => {
  if (event.type === 'alarm') {
    const alarmString = event.attributes?.alarm;
    if (!alarmString) {
      return formatNotificationTitle(t, { type: event.type, attributes: { alarms: alarmString } });
    }
    return alarmString
      .split(',')
      .map((alarm) => ALARM_NARRATIVES[alarm] || alarm)
      .join(', ');
  }
  if (event.type === 'ignitionOn') {
    return 'Motor encendido';
  }
  if (event.type === 'ignitionOff') {
    return 'Motor apagado';
  }
  return formatNotificationTitle(t, {
    type: event.type,
    attributes: { alarms: event.attributes?.alarm },
  });
};

const TraceabilityReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const positionAttributes = usePositionAttributes(t);

  const [items, setItems] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const describeItem = (item) => {
    if (item.kind === 'event') {
      return describeEvent(item.event, t);
    }
    if (item.kind === 'stop') {
      return item.text;
    }
    const label = positionAttributes[item.change.key]?.name || item.change.key;
    return describeAttributeChange(item.change, label);
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

      const stopItems = buildStopTimelineItems(deriveVehicleStops(positions));

      const timeline = [...eventItems, ...attributeItems, ...stopItems].sort(
        (a, b) => new Date(a.time) - new Date(b.time),
      );

      setItems(timeline);
      setDailySummary(deriveDailyEngineSummary(positions, from, to));
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
            {!loading && dailySummary.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mx: 2 }}>
                  Ralentí por día (motor andando, vehículo quieto)
                </Typography>
                <Table size="small" sx={{ mx: 2, mb: 2, width: 'auto' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Día</TableCell>
                      <TableCell>En movimiento</TableCell>
                      <TableCell>En ralentí</TableCell>
                      <TableCell>% en ralentí</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailySummary.map((day) => (
                      <TableRow key={day.day}>
                        <TableCell>{formatTime(day.day, 'date')}</TableCell>
                        <TableCell>{formatNumericHours(day.movingSeconds * 1000, t)}</TableCell>
                        <TableCell>{formatNumericHours(day.idleSeconds * 1000, t)}</TableCell>
                        <TableCell>
                          {day.idlePercent !== null
                            ? formatPercentage(Math.round(day.idlePercent))
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
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
