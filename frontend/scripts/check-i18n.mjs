// Vérifie que chaque texte demandé dans le code par t('ma.clé') existe dans les dictionnaires FR et EN.
// Utilisation (dans le dossier frontend) :  node scripts/check-i18n.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

const used = new Set(['apply.s1', 'apply.s2', 'apply.s3', 'apply.t1', 'apply.t2', 'apply.t3']); // clés construites dynamiquement (étapes)
for (const file of walk('src').filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('dictionaries'))) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]); // t('ma.clé')
  if (file.includes('validations') || file.includes('errors')) {
    for (const m of code.matchAll(/'((?:v|err)\.[A-Za-z0-9_.]+)'/g)) used.add(m[1]); // messages de validation / d'erreur
  }
}

let missing = 0;
for (const lang of ['fr', 'en']) {
  const keys = new Set([...readFileSync(`src/lib/i18n/dictionaries/${lang}.ts`, 'utf8').matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));
  const absent = [...used].filter((k) => !keys.has(k)).sort();
  missing += absent.length;
  console.log(`${lang.toUpperCase()} : ${absent.length === 0 ? 'aucune clé manquante ✔' : 'clés manquantes → ' + absent.join(', ')}`);
}
process.exit(missing ? 1 : 0);
