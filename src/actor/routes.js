import express from 'express';
import {
  handleInsertActorRequest, handleGetActoresRequest, handleGetActorByIdRequest,
  handleGetActoresByPeliculaIdRequest
} from './controlador.js';

export const ActorRoutes = express.Router();
ActorRoutes.post('/actor', handleInsertActorRequest);
ActorRoutes.get('/actores', handleGetActoresRequest);
ActorRoutes.get('/actor/:id', handleGetActorByIdRequest);
ActorRoutes.get('/pelicula/:id/actores', handleGetActoresByPeliculaIdRequest);
