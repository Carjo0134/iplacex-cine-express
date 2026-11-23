import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

// En Windows el resolvedor del sistema también contempla VPN y reglas de DNS de la red.
const leerDns = [
  "$ErrorActionPreference = 'Stop'",
  "$nombre = $env:CINE_ATLAS_HOST",
  "$srv = @(Resolve-DnsName -Name ('_mongodb._tcp.' + $nombre) -Type SRV -DnsOnly | Where-Object Type -eq 'SRV' | Select-Object NameTarget,Port)",
  "$txt = @(Resolve-DnsName -Name $nombre -Type TXT -DnsOnly | Where-Object Type -eq 'TXT' | ForEach-Object { $_.Strings -join '' })",
  "@{ nodos = $srv; opciones = $txt } | ConvertTo-Json -Depth 4 -Compress"
].join('\n');

export async function uriConDnsDeWindows(uri) {
  const origen = new URL(uri);
  const entorno = { ...process.env, CINE_ATLAS_HOST: origen.hostname };
  delete entorno.MONGODB_URI;
  const { stdout } = await ejecutar('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', leerDns], {
    env: entorno, windowsHide: true, timeout: 12000
  });
  const { nodos, opciones } = JSON.parse(stdout.trim());
  const dominio = origen.hostname.slice(origen.hostname.indexOf('.'));
  if (!nodos.length) throw new Error('Atlas no publicó nodos en DNS.');
  const destinos = nodos.map(nodo => {
    const host = nodo.NameTarget.toLowerCase().replace(/\.$/, '');
    if (!/^[a-z0-9.-]+$/.test(host) || !host.endsWith(dominio) || nodo.Port !== 27017) {
      throw new Error('Nodo de Atlas no válido.');
    }
    return host + ':' + nodo.Port;
  });
  const params = new URLSearchParams(origen.search);
  for (const registro of opciones) {
    for (const [campo, valor] of new URLSearchParams(registro)) {
      if (['replicaSet', 'authSource'].includes(campo) && !params.has(campo)) params.set(campo, valor);
    }
  }
  params.set('tls', 'true');
  const acceso = origen.username ? origen.username + ':' + origen.password + '@' : '';
  return 'mongodb://' + acceso + destinos.join(',') + (origen.pathname || '/') + '?' + params;
}
