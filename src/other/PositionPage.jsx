import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  Typography,
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsyncTask } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PositionValue from '../common/components/PositionValue';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    overflow: 'auto',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  rawHeader: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    background: theme.palette.action.hover,
  },
}));

const PositionPage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const positionAttributes = usePositionAttributes(t);

  const { id } = useParams();

  const [item, setItem] = useState();

  // Se separan los atributos que tienen nombre legible de los crudos del equipo.
  // `useMemo` porque `Object.getOwnPropertyNames` sobre ~90 claves corre en cada
  // render, y esta pantalla se re-renderiza al navegar entre posiciones.
  const [namedAttributes, rawAttributes] = useMemo(() => {
    if (!item?.attributes) return [[], []];
    const named = [];
    const raw = [];
    Object.getOwnPropertyNames(item.attributes).forEach((key) => {
      (positionAttributes[key]?.name ? named : raw).push(key);
    });
    return [named, raw];
  }, [item, positionAttributes]);

  useAsyncTask(
    async ({ signal }) => {
      if (id) {
        const response = await fetchOrThrow(`/api/positions?id=${id}`, { signal });
        const positions = await response.json();
        if (positions.length > 0) {
          setItem(positions[0]);
        }
      }
    },
    [id],
  );

  const deviceName = useSelector((state) => {
    if (item) {
      const device = state.devices.items[item.deviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  return (
    <div className={classes.root}>
      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <IconButton color="inherit" edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6">{deviceName}</Typography>
        </Toolbar>
      </AppBar>
      <div className={classes.content}>
        <Container maxWidth="sm">
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('stateName')}</TableCell>
                  <TableCell>{t('sharedName')}</TableCell>
                  <TableCell>{t('stateValue')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {item &&
                  Object.getOwnPropertyNames(item)
                    .filter((it) => it !== 'attributes')
                    .map((property) => (
                      <TableRow key={property}>
                        <TableCell>{property}</TableCell>
                        <TableCell>
                          <strong>{positionAttributes[property]?.name}</strong>
                        </TableCell>
                        <TableCell>
                          <PositionValue position={item} property={property} />
                        </TableCell>
                      </TableRow>
                    ))}
                {item &&
                  namedAttributes.map((attribute) => (
                    <TableRow key={attribute}>
                      <TableCell>{attribute}</TableCell>
                      <TableCell>
                        <strong>{positionAttributes[attribute].name}</strong>
                      </TableCell>
                      <TableCell>
                        <PositionValue position={item} attribute={attribute} />
                      </TableCell>
                    </TableRow>
                  ))}
                {/*
                  Los parámetros crudos del equipo (io###) van al final y bajo un
                  título, en vez de intercalados entre los legibles. Una posición
                  del Furgón 2 trae 46 de estos contra 43 con nombre: mezclados,
                  el dato útil queda enterrado. No se ocultan —a veces hace falta
                  ver el valor crudo para diagnosticar— pero dejan de competir por
                  la atención con lo que sí se entiende.
                */}
                {item && rawAttributes.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className={classes.rawHeader}>
                      Parámetros crudos del equipo ({rawAttributes.length}) — sin traducir
                    </TableCell>
                  </TableRow>
                )}
                {item &&
                  rawAttributes.map((attribute) => (
                    <TableRow key={attribute}>
                      <TableCell>{attribute}</TableCell>
                      <TableCell />
                      <TableCell>
                        <PositionValue position={item} attribute={attribute} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Paper>
        </Container>
      </div>
    </div>
  );
};

export default PositionPage;
