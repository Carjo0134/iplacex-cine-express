import express from 'express';
import cors from 'cors';
import { pathToFileURL } from 'node:url';
import { cerrar, conectar, nombreBase } from './src/common/db.js';
import { ActorRoutes } from './src/actor/routes.js';
import { peliculaRoutes } from './src/pelicula/routes.js';

export function createApp() {
  const app = express();
  const origenes = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:4000,http://127.0.0.1:4000').split(',').map(s => s.trim());
  app.disable('x-powered-by');
  app.use(cors({ origin: origenes, methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.head('/', (req, res) => res.sendStatus(405));
  app.get('/', (req, res) => res.type('text').send('Bienvenido al cine Iplacex'));
  app.use('/api', peliculaRoutes, ActorRoutes);
  app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.estado) return res.status(error.estado).json({ mensaje: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'JSON no válido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ mensaje: 'Cuerpo demasiado grande.' });
    return res.status(500).json({ mensaje: 'No se pudo completar la operación.' });
  });
  return app;
}

async function arrancar() {
  const puerto = Number(process.env.PORT || 3000);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT debe ser un número entre 1 y 65535.');
  }
  const host = process.env.RENDER === 'true' ? '0.0.0.0' : '127.0.0.1';
  try {
    const destino = await conectar(process.env.MONGODB_URI);
    console.log('Conexión a ' + destino + ' establecida. Base: ' + nombreBase + '.');
  } catch (error) {
    if (error.code === 18 || error.codeName === 'AuthenticationFailed' || /authentication failed|bad auth/i.test(error.message)) {
      throw new Error('Atlas rechazó las credenciales. Comprueba la contraseña del usuario de base de datos cine-api.');
    }
    if (error.name === 'MongoServerSelectionError') {
      throw new Error('Los nodos de MongoDB no respondieron. Comprueba la lista de IP de Atlas y la conexión de red.');
    }
    if (['querySrv', 'queryTxt'].includes(error.syscall) || error.cmd) {
      throw new Error('No se pudieron obtener los nodos del clúster mediante DNS.');
    }
    if (error.name === 'MongoParseError' || error instanceof TypeError) {
      throw new Error('Revisa el formato de MONGODB_URI. Express no arrancó.');
    }
    throw new Error('No se pudo iniciar la conexión a MongoDB. Express no arrancó.');
  }
  const servidor = createApp().listen(puerto, host, error => {
    if (error) {
      console.error('Express no pudo abrir el puerto ' + puerto + '.');
      process.exitCode = 1;
      void cerrar();
      return;
    }
    console.log('Express está escuchando en ' + host + ':' + puerto);
  });
  const salir = () => servidor.close(() => { void cerrar(); });
  process.once('SIGINT', salir);
  process.once('SIGTERM', salir);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  arrancar().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
