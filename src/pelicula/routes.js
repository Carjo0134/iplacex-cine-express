import express from 'express';
import {
  handleInsertPeliculaRequest, handleGetPeliculasRequest, handleGetPeliculaByIdRequest,
  handleUpdatePeliculaByIdRequest, handleDeletePeliculaByIdRequest
} from './controlador.js';

export const peliculaRoutes = express.Router();
const detalle = ['/pelicula/:id', '/pel%C3%ADcula/:id'];

peliculaRoutes.post('/pelicula', handleInsertPeliculaRequest);
peliculaRoutes.get('/peliculas', handleGetPeliculasRequest);
peliculaRoutes.get(detalle, handleGetPeliculaByIdRequest);
peliculaRoutes.put(detalle, handleUpdatePeliculaByIdRequest);
peliculaRoutes.delete(detalle, handleDeletePeliculaByIdRequest);
