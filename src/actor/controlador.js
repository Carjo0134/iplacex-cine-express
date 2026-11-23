import { coleccion } from '../common/db.js';
import { ObjectId } from 'mongodb';
import { errorHttp, texto } from '../common/validacion.js';
import { peliculaCollection } from '../pelicula/controlador.js';
import { Actor } from './actor.js';

const actorCollection = () => coleccion('actores');

export async function handleInsertActorRequest(req, res, next) {
  const datos = req.body ?? {};
  const nombre = texto(datos.nombrePelicula ?? datos.pelicula, 'nombrePelicula');
  return peliculaCollection().find({ nombre }).project({ _id: 1 }).limit(2).toArray()
    .then(peliculas => {
      if (!peliculas.length) throw errorHttp(404, 'Película no encontrada.');
      if (peliculas.length > 1) throw errorHttp(409, 'Hay más de una película con ese nombre.');
      const actor = Actor(datos, peliculas[0]._id.toHexString());
      return actorCollection().insertOne(actor)
        .then(({ insertedId }) => res.status(201).json({ ...actor, _id: insertedId }));
    })
    .catch(next);
}

export async function handleGetActoresRequest(req, res, next) {
  return actorCollection().find({}).toArray()
    .then(actores => res.json(actores))
    .catch(next);
}

function buscarReparto(_id) {
  return peliculaCollection().findOne({ _id }, { projection: { _id: 1 } })
    .then(pelicula => {
      if (!pelicula) throw errorHttp(404, 'Película no encontrada.');
      return actorCollection().find({ idPelicula: _id.toHexString() }).toArray();
    });
}

export async function handleGetActorByIdRequest(req, res, next) {
  let _id;
  try {
    _id = ObjectId.createFromHexString(req.params.id);
  } catch {
    return next(errorHttp(400, 'Id mal formado.'));
  }
  return actorCollection().findOne({ _id })
    .then(actor => actor ?? buscarReparto(_id))
    .then(resultado => res.json(resultado))
    .catch(next);
}

export async function handleGetActoresByPeliculaIdRequest(req, res, next) {
  let _id;
  try {
    _id = ObjectId.createFromHexString(req.params.id);
  } catch {
    return next(errorHttp(400, 'Id mal formado.'));
  }
  return buscarReparto(_id)
    .then(actores => res.json(actores))
    .catch(next);
}

export { handleGetActoresByPeliculaIdRequest as handleGetActoresByPeliculaRequest };
