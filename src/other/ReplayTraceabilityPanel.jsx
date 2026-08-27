import { useEffect, useRef } from 'react';
import { Box, Divider, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { formatNumber, formatSpeed, formatTime } from '../common/util/formatter';
import VehicleStatRow from '../common/vehicle/VehicleStatRow';

const useStyles = makeStyles()((theme) => ({
  root: {
    marginTop: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  stats: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  // Alto fijo con scroll propio: el recorrido puede traer miles de
  // posiciones y cientos de eventos derivados, y la lista no debe empujar el
  // resto de la pantalla (slider, controles) fuera de la vista.
  list: {
    maxHeight: 260,
    overflowY: 'auto',
  },
  empty: {
    color: theme.palette.text.secondary,
  },
}));

// Panel opcional de la pantalla de Repetición de Ruta: acompaña la
// reproducción mostrando velocidad, RPM y la cronología de trazabilidad
// (puertas, cinturones, luces, detenciones) del recorrido completo,
// resaltando el evento vigente y permitiendo saltar a cualquiera con un clic.
const ReplayTraceabilityPanel = ({ position, speedUnit, t, items, currentItemId, onSelect }) => {
  const { classes } = useStyles();
  const itemNodesRef = useRef({});

  useEffect(() => {
    if (currentItemId && itemNodesRef.current[currentItemId]) {
      itemNodesRef.current[currentItemId].scrollIntoView({ block: 'nearest' });
    }
  }, [currentItemId]);

  const rpm = position?.attributes?.rpmReal;

  return (
    <Box className={classes.root}>
      <Divider />
      <Box className={classes.stats}>
        <VehicleStatRow
          label={t('positionSpeed')}
          value={
            position && typeof position.speed === 'number'
              ? formatSpeed(position.speed, speedUnit, t)
              : undefined
          }
        />
        <VehicleStatRow
          label="RPM"
          value={typeof rpm === 'number' ? formatNumber(rpm, 0) : undefined}
        />
      </Box>
      <Divider />
      {items.length > 0 ? (
        <List dense disablePadding className={classes.list}>
          {items.map((item) => (
            <ListItemButton
              key={item.id}
              ref={(itemRef) => {
                itemNodesRef.current[item.id] = itemRef;
              }}
              selected={item.id === currentItemId}
              disabled={!item.position}
              onClick={() => onSelect(item)}
            >
              <ListItemText primary={item.text} secondary={formatTime(item.time, 'seconds')} />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography variant="body2" className={classes.empty}>
          Sin eventos de trazabilidad en este recorrido.
        </Typography>
      )}
    </Box>
  );
};

export default ReplayTraceabilityPanel;
