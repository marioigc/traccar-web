// src/common/vehicle/VehicleStatRow.jsx
import { Box, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(1),
    background: theme.palette.mode === 'dark' ? '#1c1f26' : theme.palette.grey[100],
    padding: theme.spacing(1, 1.5),
    borderRadius: theme.shape.borderRadius,
  },
  label: {
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
  },
  barTrack: {
    background: theme.palette.mode === 'dark' ? '#262a33' : theme.palette.grey[300],
    borderRadius: theme.shape.borderRadius,
    height: 6,
    overflow: 'hidden',
    flex: 1,
    minWidth: 40,
  },
  barFill: {
    height: '100%',
    borderRadius: theme.shape.borderRadius,
  },
  value: {
    whiteSpace: 'nowrap',
  },
}));

// `valueColor` es opcional: sin él, el valor se ve exactamente igual que
// siempre (color de texto por defecto de `Typography`). Sirve para casos como
// "Última conexión", donde un equipo fuera de línea necesita saltar a la
// vista en vez de leerse como una fecha más.
const VehicleStatRow = ({ label, value, barPercent, barColor, valueColor }) => {
  const { classes } = useStyles();

  if (value === undefined || value === null) {
    return null;
  }

  return (
    <Box className={classes.row}>
      <Typography variant="body2" className={classes.label}>
        {label}
      </Typography>
      {barPercent !== undefined && barPercent !== null && (
        <Box className={classes.barTrack}>
          <Box
            className={classes.barFill}
            style={{ width: `${Math.max(0, Math.min(100, barPercent))}%`, background: barColor }}
          />
        </Box>
      )}
      <Typography
        variant="body2"
        className={classes.value}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default VehicleStatRow;
