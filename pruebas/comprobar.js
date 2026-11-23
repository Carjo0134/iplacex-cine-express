import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const puerto = process.env.PORT === '4000' ? 4000 : 3000;
const base = 'http://127.0.0.1:' + puerto;
const consola = createInterface({ input: process.stdin, output: process.stdout });

async function enviar(metodo, ruta, esperado, datos) {
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers: datos ? { 'Content-Type': 'application/json' } : {},
    body: datos ? JSON.stringify(datos) : undefined,
    signal: AbortSignal.timeout(12000)
  });
  const cuerpo = await respuesta.text();
  console.log('\n' + metodo + ' ' + ruta + ' → ' + respuesta.status);
  console.log(cuerpo);
  assert.equal(respuesta.status, esperado, 'El servidor devolvió otro código HTTP.');
  return respuesta.headers.get('content-type')?.includes('application/json') ? JSON.parse(cuerpo) : cuerpo;
}

try {
  assert.equal(await enviar('GET', '/', 200), 'Bienvenido al cine Iplacex');
  const titulo = (process.argv[2] ?? await consola.question('\nTítulo de prueba [La última función]: ')).trim() || 'La última función';
  const nombre = (process.argv[3] ?? await consola.question('Nombre ficticio para el reparto [Ana Sur]: ')).trim() || 'Ana Sur';
  const nombrePelicula = titulo + ' (' + randomUUID().slice(0, 8) + ')';
  const pelicula = await enviar('POST', '/api/pelicula', 201, { nombre: nombrePelicula, géneros: ['Drama'], anioEstreno: 2024 });
  const ruta = '/api/pelicula/' + pelicula._id;
  const actor = await enviar('POST', '/api/actor', 201, { nombrePelicula, nombre, edad: 32, estaRetirado: false, premios: [] });
  assert.equal(actor.idPelicula, pelicula._id);
  const editada = await enviar('PUT', ruta, 200, { anioEstreno: 2025 });
  assert.equal(editada.anioEstreno, 2025);
  const reparto = await enviar('GET', ruta + '/actores', 200);
  assert.ok(reparto.some(integrante => integrante._id === actor._id));
  await enviar('GET', '/api/pelicula/id-incorrecto', 400);
  const temporal = await enviar('POST', '/api/pelicula', 201, { nombre: nombrePelicula + ' temporal', géneros: [], anioEstreno: 2024 });
  const temporalUrl = '/api/pelicula/' + temporal._id;
  await enviar('DELETE', temporalUrl, 200);
  await enviar('GET', temporalUrl, 404);
  console.log('\nPrueba completada. Puedes abrir ' + base + ruta + '/actores para revisar el reparto.');
} catch (error) {
  console.error('\n' + (error.cause?.code === 'ECONNREFUSED' ? 'Abre primero Probar en local o Probar con Atlas y deja esa ventana abierta.' : error.message));
  process.exitCode = 1;
} finally {
  consola.close();
}
