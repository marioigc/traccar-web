// src/common/vehicle/VanDiagram.jsx
import { makeStyles } from 'tss-react/mui';
import {
  isOpen,
  COLOR_OK,
  COLOR_ALERT,
  COLOR_UNKNOWN,
  COLOR_LIGHT_LOW,
  COLOR_LIGHT_POSITION,
  COLOR_LIGHT_FOG,
  COLOR_LIGHT_OFF,
} from './vehicleAttributes';

const useStyles = makeStyles()((theme) => ({
  wrap: {
    display: 'flex',
    justifyContent: 'center',
    background: theme.palette.mode === 'dark' ? '#0e1013' : theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    justifyContent: 'center',
    marginTop: theme.spacing(1),
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
  },
  dot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    marginRight: 3,
    verticalAlign: 'middle',
  },
}));

// Puertas y maletero: gris si el equipo no lo reporta, rojo si está abierto.
const doorColor = (value) => {
  if (value === undefined) return COLOR_UNKNOWN;
  return isOpen(value) ? COLOR_ALERT : COLOR_OK;
};

// Cinturones: la semántica se invierte — abrochado (true) es lo bueno.
// Se compara con `=== true`/`=== false` en vez de usar el valor como booleano
// directo: así, cualquier valor no reconocido (un string mal tipado que
// vehicleAttributes.js no haya sabido normalizar) cae en COLOR_UNKNOWN en vez
// de afirmar un estado falso.
const beltColor = (value) => {
  if (value === true) return COLOR_OK;
  if (value === false) return COLOR_ALERT;
  return COLOR_UNKNOWN;
};

// Tres estados, no dos: encendida, apagada, y "el equipo no lo reporta". Pintar
// como apagada una luz sobre la que no hay dato sería afirmar algo falso, que es
// justamente lo que la spec prohíbe.
const lightColor = (value, onColor) => {
  if (value === true) return onColor;
  if (value === false) return COLOR_LIGHT_OFF;
  return COLOR_UNKNOWN;
};

const VanDiagram = ({ status }) => {
  const { classes } = useStyles();

  const bodyFields = [
    status.puertaChofer,
    status.puertaCopiloto,
    status.puertaLateral,
    status.maletero,
    status.cinturonChofer,
    status.cinturonCopiloto,
    status.luzPosicion,
    status.luzBaja,
    status.luzNiebla,
  ];
  if (bodyFields.every((v) => v === undefined)) {
    return null;
  }

  return (
    <>
      <div className={classes.wrap}>
        <svg width="150" height="230" viewBox="0 0 200 320">
          {/* espejos */}
          <rect x="42" y="60" width="10" height="18" rx="3" fill="#454b58" />
          <rect x="148" y="60" width="10" height="18" rx="3" fill="#454b58" />

          {/* carrocería vista desde arriba */}
          <path
            d="M 65 15 Q 50 15 45 30 L 45 270 Q 45 285 65 285 L 135 285 Q 155 285 155 270 L 155 30 Q 150 15 135 15 Z"
            fill="#2a2f38"
            stroke="#454b58"
            strokeWidth="2"
          />
          <path
            d="M 56 24 Q 56 20 65 20 L 135 20 Q 144 20 144 24 L 144 48 L 56 48 Z"
            fill="#3a4552"
            opacity="0.9"
          />
          <rect x="50" y="60" width="100" height="200" rx="6" fill="#232830" />

          {/* luz de posición: punto pequeño en cada esquina delantera */}
          <circle
            cx="50"
            cy="17"
            r="3.5"
            fill={lightColor(status.luzPosicion, COLOR_LIGHT_POSITION)}
          />
          <circle
            cx="150"
            cy="17"
            r="3.5"
            fill={lightColor(status.luzPosicion, COLOR_LIGHT_POSITION)}
          />

          {/* luz baja: faro grande con halo */}
          <circle
            cx="70"
            cy="14"
            r="11"
            fill={lightColor(status.luzBaja, COLOR_LIGHT_LOW)}
            opacity="0.25"
          />
          <circle
            cx="130"
            cy="14"
            r="11"
            fill={lightColor(status.luzBaja, COLOR_LIGHT_LOW)}
            opacity="0.25"
          />
          <circle cx="70" cy="14" r="7" fill={lightColor(status.luzBaja, COLOR_LIGHT_LOW)} />
          <circle cx="130" cy="14" r="7" fill={lightColor(status.luzBaja, COLOR_LIGHT_LOW)} />

          {/* antiniebla: rectángulo bajo, cerca del paragolpes */}
          <rect
            x="55"
            y="50"
            width="10"
            height="6"
            rx="2"
            fill={lightColor(status.luzNiebla, COLOR_LIGHT_FOG)}
          />
          <rect
            x="135"
            y="50"
            width="10"
            height="6"
            rx="2"
            fill={lightColor(status.luzNiebla, COLOR_LIGHT_FOG)}
          />

          {/* ruedas (decorativas) */}
          <rect x="38" y="75" width="10" height="30" rx="3" fill="#111318" />
          <rect x="152" y="75" width="10" height="30" rx="3" fill="#111318" />
          <rect x="38" y="195" width="10" height="30" rx="3" fill="#111318" />
          <rect x="152" y="195" width="10" height="30" rx="3" fill="#111318" />

          {/* puerta chofer */}
          <rect
            x="46"
            y="65"
            width="10"
            height="55"
            rx="3"
            fill="#1c1f26"
            stroke={doorColor(status.puertaChofer)}
            strokeWidth="2.5"
          />
          {/* puerta copiloto */}
          <rect
            x="144"
            y="65"
            width="10"
            height="55"
            rx="3"
            fill="#1c1f26"
            stroke={doorColor(status.puertaCopiloto)}
            strokeWidth="2.5"
          />
          {/* puerta lateral derecha (corrediza) — el vehículo no tiene trasera izquierda */}
          <rect
            x="144"
            y="145"
            width="10"
            height="70"
            rx="3"
            fill="#1c1f26"
            stroke={doorColor(status.puertaLateral)}
            strokeWidth="2.5"
          />
          {/* maletero */}
          <rect
            x="50"
            y="255"
            width="100"
            height="10"
            rx="3"
            fill="#1c1f26"
            stroke={doorColor(status.maletero)}
            strokeWidth="2.5"
          />

          {/* cinturones delanteros (solo 2 — el perfil CAN del Partner no reporta traseros) */}
          <circle
            cx="70"
            cy="90"
            r="9"
            fill="#1c1f26"
            stroke={beltColor(status.cinturonChofer)}
            strokeWidth="2.5"
          />
          <circle
            cx="130"
            cy="90"
            r="9"
            fill="#1c1f26"
            stroke={beltColor(status.cinturonCopiloto)}
            strokeWidth="2.5"
          />
        </svg>
      </div>
      <div className={classes.legend}>
        <span>
          <span className={classes.dot} style={{ background: COLOR_OK }} />
          OK
        </span>
        <span>
          <span className={classes.dot} style={{ background: COLOR_ALERT }} />
          Alerta
        </span>
        <span>
          <span className={classes.dot} style={{ background: COLOR_LIGHT_LOW }} />
          Luz baja
        </span>
        <span>
          <span className={classes.dot} style={{ background: COLOR_LIGHT_POSITION }} />
          Posición
        </span>
        <span>
          <span className={classes.dot} style={{ background: COLOR_LIGHT_FOG }} />
          Niebla
        </span>
        <span>
          <span className={classes.dot} style={{ background: COLOR_LIGHT_OFF }} />
          Apagada
        </span>
        <span>
          <span className={classes.dot} style={{ background: COLOR_UNKNOWN }} />
          Sin dato
        </span>
      </div>
    </>
  );
};

export default VanDiagram;
