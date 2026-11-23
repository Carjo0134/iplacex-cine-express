import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { ObjectId } from 'mongodb';
import { createApp } from '../server.js';
import { cerrar, coleccion, conectar } from '../src/common/db.js';

const prefijo = `prueba-${randomUUID()}`;
const peliculasDePrueba = new Set();
const actoresDePrueba = new Set();
let servidor;
let origen;
let conectado = false;

before(async () => {
  const valor = process.env.PRUEBA_MONGODB_URI ?? '';
  if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?(?:\/(?:cine-db)?)?(?:\?directConnection=true)?$/i.test(valor)) {
    throw new Error('Define PRUEBA_MONGODB_URI con una instancia MongoDB local de pruebas, por ejemplo mongodb://127.0.0.1:27019/');
  }
  const uriLocal = new URL(valor);
  uriLocal.searchParams.set('directConnection', 'true');
  await conectar(uriLocal.href);
  conectado = true;
  servidor = createApp().listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  origen = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  try {
    if (servidor?.listening) {
      await new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve()));
    }
    if (conectado) {
      await Promise.all([
        coleccion('actores').deleteMany({ nombre: { $in: [...actoresDePrueba] } }),
        coleccion('peliculas').deleteMany({ nombre: { $in: [...peliculasDePrueba] } }),
      ]);
    }
  } finally {
    if (conectado) await cerrar();
  }
});

function nombreDePrueba(etiqueta, registros) {
  const nombre = `${prefijo} ${etiqueta}`;
  registros.add(nombre);
  return nombre;
}

async function pedir(metodo, ruta, estado, datos) {
  const respuesta = await fetch(origen + ruta, {
    method: metodo,
    headers: datos === undefined ? {} : { 'Content-Type': 'application/json' },
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });
  const cuerpo = await respuesta.text();
  assert.equal(respuesta.status, estado, `${metodo} ${ruta}: ${respuesta.status}. ${cuerpo}`);
  assert.match(respuesta.headers.get('content-type') ?? '', /application\/json/);
  return JSON.parse(cuerpo);
}

function pelicula(etiqueta) {
  return { nombre: nombreDePrueba(etiqueta, peliculasDePrueba), géneros: ['Aventura'], anioEstreno: 2020 };
}

function actor(etiqueta, nombrePelicula) {
  return {
    nombre: nombreDePrueba(etiqueta, actoresDePrueba),
    nombrePelicula,
    edad: 28,
    estaRetirado: false,
    premios: ['Premio del público'],
  };
}

test('la ruta de bienvenida responde a GET', async () => {
  const respuesta = await fetch(origen);
  assert.equal(respuesta.status, 200);
  const texto = await respuesta.text();
  assert.equal(texto, 'Bienvenido al cine Iplacex');
  assert.equal((await fetch(origen, { method: 'POST' })).status, 404);
});

test('el navegador obtiene los permisos CORS para enviar JSON', async () => {
  const sitio = 'http://localhost:3000';
  const respuesta = await fetch(origen + '/api/pelicula', {
    method: 'OPTIONS',
    headers: {
      Origin: sitio,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  });
  assert.ok([200, 204].includes(respuesta.status));
  assert.ok(['*', sitio].includes(respuesta.headers.get('access-control-allow-origin')));
  assert.match(respuesta.headers.get('access-control-allow-methods') ?? '', /\bPOST\b/i);
  assert.match(respuesta.headers.get('access-control-allow-headers') ?? '', /content-type|\*/i);
});

test('una película se guarda, aparece en el listado, se edita y se elimina', async () => {
  const datos = pelicula('El viaje');
  const creada = await pedir('POST', '/api/pelicula', 201, datos);
  assert.match(creada._id, /^[a-f\d]{24}$/i);
  assert.deepEqual(creada, { _id: creada._id, ...datos });

  const ruta = `/api/pelicula/${creada._id}`;
  assert.deepEqual(await pedir('GET', ruta, 200), creada);
  assert.deepEqual(await pedir('GET', `/api/película/${creada._id}`, 200), creada);
  const todas = await pedir('GET', '/api/peliculas', 200);
  assert.ok(todas.some(item => item._id === creada._id));

  const cambios = { ...datos, géneros: ['Drama'], anioEstreno: 2021 };
  const editada = await pedir('PUT', ruta, 200, cambios);
  assert.deepEqual(editada, { _id: creada._id, ...cambios });
  assert.deepEqual(await pedir('GET', ruta, 200), editada);
  const borrada = await pedir('DELETE', ruta, 200);
  assert.ok(borrada && typeof borrada === 'object' && !Array.isArray(borrada));
  await pedir('GET', ruta, 404);
  await pedir('PUT', ruta, 404, cambios);
  await pedir('DELETE', ruta, 404);
});

test('los actores se asocian por nombre de película y se consultan por su identificador', async () => {
  const primera = await pedir('POST', '/api/pelicula', 201, pelicula('Luna'));
  const segunda = await pedir('POST', '/api/pelicula', 201, pelicula('Sol'));
  const rutaReparto = `/api/pelicula/${primera._id}/actores`;
  assert.deepEqual(await pedir('GET', rutaReparto, 200), []);
  const guardados = [];
  for (const [nombre, filme] of [['Ada', primera], ['Nora', primera], ['Marco', segunda]]) {
    const datos = actor(nombre, filme.nombre);
    const creado = await pedir('POST', '/api/actor', 201, datos);
    const { nombrePelicula, ...campos } = datos;
    assert.match(creado._id, /^[a-f\d]{24}$/i);
    assert.deepEqual(creado, { _id: creado._id, ...campos, idPelicula: filme._id });
    guardados.push(creado);
  }
  assert.deepEqual(await pedir('GET', `/api/actor/${guardados[0]._id}`, 200), guardados[0]);
  const todos = await pedir('GET', '/api/actores', 200);
  assert.ok(guardados.every(actor => todos.some(item => item._id === actor._id)));
  const esperados = guardados.slice(0, 2).map(actor => actor._id).sort();
  for (const ruta of [rutaReparto, `/api/actor/${primera._id}`]) {
    const reparto = await pedir('GET', ruta, 200);
    assert.deepEqual(reparto.map(actor => actor._id).sort(), esperados);
  }
});

test('un actor con una película inexistente no queda registrado', async () => {
  const datos = actor('Sara', `${prefijo} película ausente`);
  await pedir('POST', '/api/actor', 404, datos);
  assert.equal(await coleccion('actores').countDocuments({ nombre: datos.nombre }), 0);
  const idAusente = new ObjectId().toHexString();
  await pedir('GET', `/api/actor/${idAusente}`, 404);
  await pedir('GET', `/api/pelicula/${idAusente}/actores`, 404);
});

test('los identificadores mal formados devuelven 400', async () => {
  const ruta = '/api/pelicula/abc';
  await pedir('GET', ruta, 400);
  await pedir('PUT', ruta, 400, pelicula('Inválida'));
  await pedir('DELETE', ruta, 400);
  await pedir('GET', '/api/actor/abc', 400);
  await pedir('GET', ruta + '/actores', 400);
});

test('los tipos incorrectos o el JSON incompleto devuelven 400', async () => {
  const datos = pelicula('Fecha inválida');
  await pedir('POST', '/api/pelicula', 400, { ...datos, anioEstreno: 'ayer' });
  assert.equal(await coleccion('peliculas').countDocuments({ nombre: datos.nombre }), 0);
  const respuesta = await fetch(origen + '/api/pelicula', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"nombre":',
  });
  assert.equal(respuesta.status, 400);
});
