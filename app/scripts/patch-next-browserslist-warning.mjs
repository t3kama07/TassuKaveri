import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const browserslistBundlePath = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'compiled',
  'browserslist',
  'index.js'
);

const target =
  '1764339020978<(new Date).setMonth((new Date).getMonth()-2)&&console.warn("[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`");';

const replacement =
  '!process.env.BROWSERSLIST_IGNORE_OLD_DATA&&!process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA&&1764339020978<(new Date).setMonth((new Date).getMonth()-2)&&console.warn("[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`");';

try {
  const current = readFileSync(browserslistBundlePath, 'utf8');

  if (current.includes(replacement)) {
    console.log('Next bundled browserslist warning patch already applied.');
    process.exit(0);
  }

  if (!current.includes(target)) {
    console.warn('Next bundled browserslist warning patch skipped: target snippet not found.');
    process.exit(0);
  }

  writeFileSync(browserslistBundlePath, current.replace(target, replacement), 'utf8');
  console.log('Patched Next bundled browserslist warning to respect ignore env flags.');
} catch (error) {
  console.warn(
    `Next bundled browserslist warning patch skipped: ${
      error instanceof Error ? error.message : 'unknown error'
    }`
  );
}
