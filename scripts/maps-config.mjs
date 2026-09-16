// Genera maps-config.js con la clave de Google Maps, leída de la variable de entorno
// GOOGLE_MAPS_API_KEY (en Vercel) o del archivo .env (en local).
// maps-config.js está en .gitignore: la clave nunca se sube al repo.
//
//   node scripts/maps-config.mjs
//
// Vercel lo corre como build command (ver vercel.json).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fromDotEnv(name) {
  const file = join(root, '.env');
  if (!existsSync(file)) return '';
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && match[1] === name) return match[2].replace(/^(['"])(.*)\1$/, '$2').trim();
  }
  return '';
}

const key = (process.env.GOOGLE_MAPS_API_KEY || fromDotEnv('GOOGLE_MAPS_API_KEY')).trim();

writeFileSync(
  join(root, 'maps-config.js'),
  '// Archivo generado por scripts/maps-config.mjs. No editar ni subir al repo.\n' +
  'window.EM_MAPS_KEY = ' + JSON.stringify(key) + ';\n'
);

console.log(key
  ? 'maps-config.js generado con la clave de Google Maps.'
  : 'maps-config.js generado sin clave: el modal de locales va a mostrar la lista sin mapa. Cargá GOOGLE_MAPS_API_KEY en .env o en Vercel.');
