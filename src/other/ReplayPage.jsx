import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { IconButton, Paper, Slider, Toolbar, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
import { formatTime } from '../common/util/formatter';
import ReportFilter from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatchCallback } from '../reactHelper';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import MapOverlay from '../map/overlay/MapOverlay';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { useAttributePreference } from '../common/util/preferences';
import {
  deriveAttributeChanges,
  deriveVehicleStops,
  buildStopTimelineItems,
  describeAttributeChange,
} from '../common/vehicle/traceability';
import ReplayTraceabilityPanel from './ReplayTraceabilityPanel';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    margin: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
    },
  },
  title: {
    flexGrow: 1,
  },
  slider: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formControlLabel: {
    height: '100%',
    width: '100%',
    paddingRight: theme.spacing(1),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      margin: theme.spacing(1),
    },
    [theme.breakpoints.up('md')]: {
      marginTop: theme.spacing(1),
    },
  },
}));

const ReplayPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();

  const [searchParams] = useSearchParams();

  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(false);

  const loaded = Boolean(from && to && !loading && positions.length);

  const speedUnit = useAttributePreference('speedUnit');
  const positionAttributes = usePositionAttributes(t);

  // Cronología de trazabilidad (puertas, cinturones, luces, detenciones) del
  // recorrido completo. Se recalcula solo cuando cambian las posiciones (un
  // recorrido puede traer miles), nunca en cada tick de la reproducción; y ni
  // siquiera eso si el panel está cerrado (comportamiento por defecto).
  const traceabilityItems = useMemo(() => {
    if (!traceabilityOpen || !positions.length) {
      return [];
    }
    const attributeItems = deriveAttributeChanges(positions).map((change) => ({
      id: change.id,
      time: change.time,
      text: describeAttributeChange(change, positionAttributes[change.key]?.name || change.key),
      position: change.position,
    }));
    const stopItems = buildStopTimelineItems(deriveVehicleStops(positions));
    return [...attributeItems, ...stopItems].sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [positions, positionAttributes, traceabilityOpen]);

  const positionIndexById = useMemo(() => {
    const map = new Map();
    positions.forEach((position, i) => map.set(position.id, i));
    return map;
  }, [positions]);

  // El evento vigente sí se recalcula en cada tick, pero recorre solo la
  // cronología ya derivada (cientos de filas como mucho), no las miles de
  // posiciones del recorrido.
  const currentTraceabilityItemId = useMemo(() => {
    const currentPosition = positions[index];
    if (!traceabilityItems.length || !currentPosition) {
      return null;
    }
    const currentTime = new Date(currentPosition.fixTime).getTime();
    let currentId = null;
    for (let i = 0; i < traceabilityItems.length; i += 1) {
      if (new Date(traceabilityItems[i].time).getTime() <= currentTime) {
        currentId = traceabilityItems[i].id;
      } else {
        break;
      }
    }
    return currentId;
  }, [traceabilityItems, positions, index]);

  const onSelectTraceabilityItem = useCallback(
    (item) => {
      const targetIndex = positionIndexById.get(item.position?.id);
      if (targetIndex !== undefined) {
        setIndex(targetIndex);
      }
    },
    [positionIndexById],
  );

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const device = state.devices.items[selectedDeviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!from && !to) {
      setPositions([]);
    }
  }, [from, to, setPositions]);

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setIndex((index) => index + 1);
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [playing, positions]);

  useEffect(() => {
    if (index >= positions.length - 1) {
      clearInterval(timerRef.current);
      setPlaying(false);
    }
  }, [index, positions]);

  const onPointClick = useCallback(
    (_, index) => {
      setIndex(index);
    },
    [setIndex],
  );

  const onMarkerClick = useCallback(
    (positionId) => {
      setShowCard(!!positionId);
    },
    [setShowCard],
  );

  const onShow = useCatchCallback(
    async ({ deviceIds, from, to }) => {
      const deviceId = deviceIds.find(() => true);
      setLoading(true);
      setSelectedDeviceId(deviceId);
      const query = new URLSearchParams({ deviceId, from, to });
      try {
        const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
        setIndex(0);
        const positions = await response.json();
        setPositions(positions);
        if (!positions.length) {
          throw Error(t('sharedNoData'));
        }
        setFilterOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const handleDownload = () => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  return (
    <div className={classes.root}>
      <MapView>
        <MapOverlay />
        <MapGeofence />
        <MapRoutePath positions={positions} />
        <MapRoutePoints positions={positions} onClick={onPointClick} showSpeedControl />
        {index < positions.length && (
          <MapPositions
            positions={[positions[index]]}
            onMarkerClick={onMarkerClick}
            titleField="fixTime"
          />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={positions} />
      <div className={classes.sidebar}>
        <Paper elevation={3} square>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {t('reportReplay')}
            </Typography>
            {loaded && (
              <>
                <IconButton onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
                <IconButton
                  color={traceabilityOpen ? 'primary' : 'default'}
                  onClick={() => setTraceabilityOpen((open) => !open)}
                >
                  <MeetingRoomIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => setFilterOpen((open) => !open)}>
                  <TuneIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </Paper>
        <Paper className={classes.content} square>
          {loaded && !filterOpen && (
            <>
              <Typography variant="subtitle1" align="center">
                {deviceName}
              </Typography>
              <Slider
                className={classes.slider}
                max={positions.length - 1}
                step={null}
                marks={positions.map((_, index) => ({ value: index }))}
                value={index}
                onChange={(_, index) => setIndex(index)}
              />
              <div className={classes.controls}>
                <Typography variant="caption">{`${index + 1}/${positions.length}`}</Typography>
                <IconButton
                  onClick={() => setIndex((index) => index - 1)}
                  disabled={playing || index <= 0}
                >
                  <FastRewindIcon />
                </IconButton>
                <IconButton
                  onClick={() => setPlaying(!playing)}
                  disabled={index >= positions.length - 1}
                >
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton
                  onClick={() => setIndex((index) => index + 1)}
                  disabled={playing || index >= positions.length - 1}
                >
                  <FastForwardIcon />
                </IconButton>
                <Typography variant="caption">
                  {formatTime(positions[index].fixTime, 'seconds')}
                </Typography>
              </div>
              {traceabilityOpen && (
                <ReplayTraceabilityPanel
                  position={positions[index]}
                  speedUnit={speedUnit}
                  t={t}
                  items={traceabilityItems}
                  currentItemId={currentTraceabilityItemId}
                  onSelect={onSelectTraceabilityItem}
                />
              )}
            </>
          )}
          <div style={{ display: loaded && !filterOpen ? 'none' : 'block' }}>
            <ReportFilter onShow={onShow} deviceType="single" loading={loading} />
          </div>
        </Paper>
      </div>
      {showCard && index < positions.length && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={positions[index]}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayPage;
