import { MongoClient } from 'mongodb';
import { uriConDnsDeWindows } from './atlas-windows.js';

export const nombreBase = 'cine-db';
export let cliente;

export async function conectar(uri) {
  if (!uri) throw new Error('Falta la variable MONGODB_URI.');
  const destino = new URL(uri);
  const enAtlas = destino.protocol === 'mongodb+srv:' &&
    /^eva-u3-express\.[a-z\d-]+\.mongodb\.net$/i.test(destino.hostname);
  const enLocal = destino.protocol === 'mongodb:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname);
  if (!enAtlas && !enLocal) throw new Error('El destino de MongoDB es incorrecto.');

  let conexion = new MongoClient(uri, { serverSelectionTimeoutMS: 6500 });
  try {
    try {
      await conexion.connect();
    } catch (error) {
      const errorDns = ['querySrv', 'queryTxt'].includes(error.syscall);
      if (!enAtlas || process.platform !== 'win32' || !errorDns) throw error;
      await conexion.close();
      const uriDirecta = await uriConDnsDeWindows(uri);
      conexion = new MongoClient(uriDirecta, { serverSelectionTimeoutMS: 10000 });
      await conexion.connect();
    }
    await conexion.db(nombreBase).command({ ping: 1 });
    cliente = conexion;
  } catch (error) {
    await conexion.close();
    throw error;
  }
  return enAtlas ? 'MongoDB Atlas (eva-u3-express)' : 'MongoDB local';
}

export function coleccion(nombre) {
  return cliente.db(nombreBase).collection(nombre);
}

export async function cerrar() {
  if (cliente) await cliente.close();
  cliente = undefined;
}
