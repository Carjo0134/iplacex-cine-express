# Cine Iplacex

API REST para el registro anónimo de películas favoritas y su reparto. Utiliza Node.js 22, Express, CORS y el driver oficial de MongoDB. En local escucha en 127.0.0.1 y usa el puerto 3000 por defecto. En Render escucha en 0.0.0.0 y toma el puerto de la variable `PORT` asignada por la plataforma.

## Ejecución

Desde la carpeta del proyecto, `npm ci` instala las versiones de `package-lock.json`. Arranca con `npm start` después de definir `MONGODB_URI` en la sesión. La URI de Atlas es la del servidor `eva-u3-express.lwlbzdt.mongodb.net` con un usuario de base de datos con lectura y escritura en `cine-db`. La aplicación selecciona esa base en el código. Para prácticas locales también acepta `mongodb://127.0.0.1:27028` con un MongoDB en ejecución. El servidor abre el puerto después de conectar y recibir respuesta al comando `ping`. La raíz responde a GET con «Bienvenido al cine Iplacex».

Por defecto, CORS admite los orígenes locales en 3000 y 4000. Para conectar un sitio con otro origen, define `CORS_ORIGINS` con los orígenes permitidos separados por comas.

## Render

Crea un Web Service con el runtime Node y selecciona la carpeta que contiene `package.json`. Usa `npm ci` como Build Command y `npm start` como Start Command. Declara `MONGODB_URI` en Environment y agrega los rangos de salida del servicio a IP Access List en Atlas. El servicio utiliza `RENDER=true`, variable que Render proporciona automáticamente. Para este catálogo de práctica, `/api/peliculas` sirve como Health Check Path porque verifica una lectura en MongoDB. La ruta `/` muestra el saludo de la API.

## Películas y actores

| Método | Ruta | Operación |
| --- | --- | --- |
| POST | /api/pelicula | Registrar una película |
| GET | /api/peliculas | Listar películas |
| GET | /api/pelicula/:id | Consultar una película |
| PUT | /api/pelicula/:id | Modificar campos de una película |
| DELETE | /api/pelicula/:id | Eliminar una película |
| POST | /api/actor | Registrar una persona del reparto |
| GET | /api/actores | Listar actores |
| GET | /api/actor/:id | Buscar un actor por su identificador |
| GET | /api/pelicula/:id/actores | Consultar el reparto de una película |

Las rutas de detalle de película también aceptan la grafía `/api/película/:id`. En la ruta corta `/api/actor/:valor`, un identificador de actor devuelve un objeto. Si corresponde a una película, devuelve su reparto como lista. La ruta explícita `/api/pelicula/:id/actores` siempre consulta el reparto.

El cuerpo de una película tiene esta forma:

```json
{ "nombre": "La orilla", "géneros": ["Drama"], "anioEstreno": 2024 }
```

Para registrar un actor se envía el nombre de una película existente:

```json
{ "nombrePelicula": "La orilla", "nombre": "Ana Sur", "edad": 32, "estaRetirado": false, "premios": [] }
```

MongoDB genera los identificadores. El actor conserva en `idPelicula` el identificador de la película como texto. Si dos películas tienen el mismo título, el alta del actor devuelve 409 para evitar asignarlo al reparto equivocado. El borrado de una película afecta solo a su documento.

## Pruebas

Con la API abierta, `node pruebas/comprobar.js` permite registrar una película de prueba, asociar un actor y consultar el reparto. Añade un sufijo al título para que cada ejecución tenga datos propios. La película con reparto queda disponible para revisarla. Las operaciones de borrado usan una segunda película creada por la misma prueba. La colección `pruebas/Cine.postman_collection.json` permite realizar un recorrido desde Postman.

Para la suite automática, deja MongoDB local en ejecución y establece `PRUEBA_MONGODB_URI` con su dirección local. En PowerShell, por ejemplo, `$env:PRUEBA_MONGODB_URI = 'mongodb://127.0.0.1:27028'`. Luego ejecuta `npm test` en la carpeta del proyecto. La suite crea un servidor en un puerto libre y al finalizar elimina sus registros de prueba.
