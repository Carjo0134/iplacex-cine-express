export function errorHttp(estado, mensaje) {
  return Object.assign(new Error(mensaje), { estado });
}

export function texto(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) throw errorHttp(400, 'Revisa el campo ' + campo + '.');
  return valor.trim();
}

export function entero(valor, campo) {
  const numero = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  if (!Number.isInteger(numero) || numero < 0 || numero > 2147483647) {
    throw errorHttp(400, 'Se esperaba un entero en ' + campo + '.');
  }
  return numero;
}

export function lista(valor, campo) {
  if (!Array.isArray(valor)) throw errorHttp(400, 'Se esperaba una lista en ' + campo + '.');
  return valor.map(item => texto(item, campo));
}

export function booleano(valor) {
  if (valor === true || valor === 'true') return true;
  if (valor === false || valor === 'false') return false;
  throw errorHttp(400, 'estaRetirado debe ser true o false.');
}
