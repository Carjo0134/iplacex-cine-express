import { booleano, entero, lista, texto } from '../common/validacion.js';

export const Actor = (datos, idPelicula) => ({
  idPelicula,
  nombre: texto(datos.nombre, 'nombre'),
  edad: entero(datos.edad, 'edad'),
  estaRetirado: booleano(datos.estaRetirado),
  premios: lista(datos.premios, 'premios')
});
