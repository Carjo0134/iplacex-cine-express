import { coleccion } from '../common/db.js';
import { ObjectId } from 'mongodb';
import { errorHttp } from '../common/validacion.js';
import { Pelicula } from './película.js';

export const peliculaCollection = () => coleccion('peliculas');

export async function handleInsertPeliculaRequest(req, res, next) {
  const pelicula = Pelicula(req.body);
  return peliculaCollection().insertOne(pelicula)
    .then(({ insertedId }) => res.status(201).json({ ...pelicula, _id: insertedId }))
    .catch(next);
}

export async function handleGetPeliculasRequest(req, res, next) {
  return peliculaCollection().find({}).toArray()
    .then(peliculas => res.json(peliculas))
    .catch(next);
}

export async function handleGetPeliculaByIdRequest(req, res, next) {
  let _id;
  try {
    _id = ObjectId.createFromHexString(req.params.id);
  } catch {
    return next(errorHttp(400, 'Id mal formado.'));
  }
  return peliculaCollection().findOne({ _id })
    .then(pelicula => {
      if (!pelicula) throw errorHttp(404, 'Película no encontrada.');
      return res.json(pelicula);
    })
    .catch(next);
}

export async function handleUpdatePeliculaByIdRequest(req, res, next) {
  let _id;
  try {
    _id = ObjectId.createFromHexString(req.params.id);
  } catch {
    return next(errorHttp(400, 'Id mal formado.'));
  }
  const cambios = Pelicula(req.body, true);
  return peliculaCollection().findOneAndUpdate({ _id }, { $set: cambios }, { returnDocument: 'after' })
    .then(pelicula => {
      if (!pelicula) throw errorHttp(404, 'Película no encontrada.');
      return res.json(pelicula);
    })
    .catch(next);
}

export async function handleDeletePeliculaByIdRequest(req, res, next) {
  let _id;
  try {
    _id = ObjectId.createFromHexString(req.params.id);
  } catch {
    return next(errorHttp(400, 'Id mal formado.'));
  }
  return peliculaCollection().deleteOne({ _id })
    .then(({ deletedCount }) => {
      if (!deletedCount) throw errorHttp(404, 'Película no encontrada.');
      return res.json({ _id, mensaje: 'Película eliminada.' });
    })
    .catch(next);
}
