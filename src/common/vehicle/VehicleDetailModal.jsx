// src/common/vehicle/VehicleDetailModal.jsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Link,
  Tooltip,
  Chip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';

import { useTranslation } from '../components/LocalizationProvider';
import RemoveDialog from '../components/RemoveDialog';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import { useAttributePreference } from '../util/preferences';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatSpeed, formatVoltage, formatTemperature, formatNumber } from '../util/formatter';
import { getVehicleStatus, COLOR_OK, COLOR_ALERT, COLOR_INFO } from './vehicleAttributes';
import VanDiagram from './VanDiagram';
import VehicleStatRow from './VehicleStatRow';

// Mismo patrón que `src/main/DeviceRow.jsx:38`, que ya usa `.fromNow()` para
// mostrar la antigüedad de la última posición en la lista de dispositivos.
dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  modalBox: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: theme.palette.mode === 'dark' ? '#14161b' : theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(3),
    maxWidth: 640,
    width: '92vw',
    maxHeight: '90vh',
    overflow: 'auto',
    outline: 'none',
  },
  close: {
    position: 'absolute',
    top: theme.spacing(1.5),
    right: theme.spacing(1.5),
  },
  top: {
    display: 'flex',
    gap: theme.spacing(3),
    flexWrap: 'wrap',
  },
  colLeft: {
    flex: '0 0 190px',
  },
  colRight: {
    flex: 1,
    minWidth: 240,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    justifyContent: 'center',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  sub: {
    color: theme.palette.text.secondary,
    display: 'block',
    marginBottom: theme.spacing(1),
  },
  masDetalles: {
    display: 'block',
    marginTop: theme.spacing(2),
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

// Solo se alerta por SOBRE-temperatura. Un motor recién encendido, en frío,
// pasa varios minutos de cada viaje por debajo de este umbral — eso es
// arranque normal, no una falla. No hay piso de temperatura mínima: no existe
// un "muy frío" que sea una alerta del vehículo, a diferencia de "muy
// caliente", que sí lo es. Por eso la alarma también exige el motor
// encendido: un furgón estacionado reporta la temperatura ambiente — Furgón 2
// marca 20 °C — y eso tampoco es una alerta.
const TEMP_MAX_OK = 105;
const RPM_MAX = 4000;

const VehicleDetailModal = ({ deviceId, position, onClose, disableActions }) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const speedUnit = useAttributePreference('speedUnit');
  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position, t]);

  // Todos los hooks quedan por encima de este return: React exige que el número
  // y el orden de los hooks sea estable entre renders.
  if (!device) {
    return null;
  }

  const status = getVehicleStatus(position, device);

  // El badge informa el estado del VEHÍCULO (motor encendido), no el de la
  // conexión del equipo — que es lo que pide la spec. `ignition` lo reportan
  // ambos modelos de GPS. Si no está, no se muestra badge en vez de inventar uno.
  const ignition = position?.attributes?.hasOwnProperty('ignition')
    ? position.attributes.ignition
    : undefined;

  // "hace X min". Sin esto, una posición de hace 18 horas se lee como el estado
  // actual del furgón — que es exactamente el caso real de FURGON_1. Se usa
  // `position.fixTime`, no `device.lastUpdate`: todas las métricas de esta
  // pantalla salen de `position`, y `device.lastUpdate` avanza con cualquier
  // mensaje del equipo (no solo los que traen posición/atributos nuevos), por
  // lo que podría mostrar una antigüedad más reciente que la del dato real en
  // pantalla.
  const lastUpdate = position?.fixTime ? dayjs(position.fixTime).fromNow() : null;

  const tempAlert =
    status.tempMotor !== undefined && ignition === true && status.tempMotor > TEMP_MAX_OK;

  // Dos atributos independientes: un equipo puede reportar litros sin
  // porcentaje (o viceversa). La fila se muestra con lo que exista, en vez de
  // depender por completo de `combustiblePct`.
  const combustibleParts = [];
  if (status.combustiblePct !== undefined) {
    combustibleParts.push(`${formatNumber(status.combustiblePct, 0)}%`);
  }
  if (status.combustibleLitros !== undefined) {
    combustibleParts.push(`${formatNumber(status.combustibleLitros, 1)} L`);
  }
  const combustibleValue = combustibleParts.length > 0 ? combustibleParts.join(' · ') : undefined;

  return (
    <>
      <Modal open onClose={onClose}>
        <Box className={classes.modalBox}>
          <IconButton className={classes.close} size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box className={classes.top}>
            <Box className={classes.colLeft}>
              <Box className={classes.hero}>
                <Typography variant="subtitle1">{status.patente || device.name}</Typography>
                {ignition !== undefined && (
                  <Chip
                    size="small"
                    label={ignition ? 'Encendido' : 'Apagado'}
                    color={ignition ? 'success' : 'default'}
                  />
                )}
              </Box>
              <Typography variant="caption" className={classes.sub}>
                {device.name}
                {lastUpdate && ` · ${lastUpdate}`}
              </Typography>
              {position && <VanDiagram status={status} />}
            </Box>

            <Box className={classes.colRight}>
              <VehicleStatRow
                label="Kilometraje"
                value={
                  status.kmReal !== undefined
                    ? `${status.kmReal.toLocaleString('es-CL', { maximumFractionDigits: 0 })} km`
                    : undefined
                }
              />
              <VehicleStatRow
                label="Velocidad"
                value={
                  position?.speed !== undefined
                    ? formatSpeed(position.speed, speedUnit, t)
                    : undefined
                }
              />
              <VehicleStatRow
                label="RPM"
                value={status.rpm !== undefined ? formatNumber(status.rpm, 0) : undefined}
                barPercent={status.rpm !== undefined ? (status.rpm / RPM_MAX) * 100 : undefined}
                barColor={COLOR_INFO}
              />
              <VehicleStatRow
                label="Temp. motor"
                value={
                  status.tempMotor !== undefined ? formatTemperature(status.tempMotor) : undefined
                }
                barPercent={
                  status.tempMotor !== undefined ? (status.tempMotor / 120) * 100 : undefined
                }
                barColor={tempAlert ? COLOR_ALERT : COLOR_OK}
              />
              <VehicleStatRow
                label="Combustible"
                value={combustibleValue}
                barPercent={status.combustiblePct}
                barColor={COLOR_OK}
              />
              <VehicleStatRow
                label="Voltaje"
                value={
                  status.voltajeVehiculo !== undefined
                    ? formatVoltage(status.voltajeVehiculo, t)
                    : undefined
                }
              />
              <VehicleStatRow
                label="Freno de mano"
                value={status.frenoMano !== undefined ? String(status.frenoMano) : undefined}
              />
            </Box>
          </Box>

          {position && (
            <Link
              component={RouterLink}
              to={`/position/${position.id}`}
              className={classes.masDetalles}
            >
              {t('sharedShowDetails')}
            </Link>
          )}

          <Box className={classes.actionBar}>
            <Tooltip title={t('sharedExtra')}>
              <span>
                <IconButton
                  color="secondary"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  disabled={!position}
                >
                  <PendingIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('reportReplay')}>
              <span>
                <IconButton
                  onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                  disabled={disableActions || !position}
                >
                  <RouteIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('commandTitle')}>
              <span>
                <IconButton
                  onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                  disabled={disableActions}
                >
                  <SendIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('sharedEdit')}>
              <span>
                <IconButton
                  onClick={() => navigate(`/settings/device/${deviceId}`)}
                  disabled={disableActions || deviceReadonly}
                >
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('sharedRemove')}>
              <span>
                <IconButton
                  color="error"
                  onClick={() => setRemoving(true)}
                  disabled={disableActions || deviceReadonly}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Modal>

      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => navigate(`/stream?deviceId=${deviceId}`)}
            disabled={position.protocol !== 'jt808'}
          >
            {t('linkLiveVideo')}
          </MenuItem>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && navigationAppLink && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}

      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default VehicleDetailModal;
