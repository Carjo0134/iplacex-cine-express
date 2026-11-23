import { entero, errorHttp, lista, texto } from '../common/validacion.js';

export const Pelicula = (datos = {}, parcial = false) => {
  const pelicula = {};
  if (!parcial || datos.nombre !== undefined) pelicula.nombre = texto(datos.nombre, 'nombre');
  if (!parcial || datos.géneros !== undefined || datos.generos !== undefined) {
    pelicula.géneros = lista(datos.géneros ?? datos.generos, 'géneros');
  }
  if (!parcial || datos.anioEstreno !== undefined) {
    pelicula.anioEstreno = entero(datos.anioEstreno, 'anioEstreno');
  }
  if (!Object.keys(pelicula).length) throw errorHttp(400, 'Faltan los campos de la película.');
  return pelicula;
};
