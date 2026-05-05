import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
]);

const tsconfigFiles = [];

function collectTsconfigs(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        collectTsconfigs(join(directory, entry.name));
      }
      continue;
    }

    if (/^tsconfig(?:\..*)?\.json$/u.test(entry.name)) {
      tsconfigFiles.push(join(directory, entry.name));
    }
  }
}

collectTsconfigs(root);

const failures = [];

for (const file of tsconfigFiles) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const compilerOptions = config.compilerOptions ?? {};
  const displayPath = relative(root, file).replaceAll('\\', '/');

  if (Object.hasOwn(compilerOptions, 'baseUrl')) {
    failures.push(`${displayPath}: remove deprecated compilerOptions.baseUrl`);
  }

  const moduleResolution = compilerOptions.moduleResolution;
  if (
    typeof moduleResolution === 'string' &&
    ['node', 'node10'].includes(moduleResolution.toLowerCase())
  ) {
    failures.push(
      `${displayPath}: use a modern moduleResolution instead of "${moduleResolution}"`,
    );
  }

  if (Object.hasOwn(compilerOptions, 'ignoreDeprecations')) {
    failures.push(
      `${displayPath}: remove compilerOptions.ignoreDeprecations and fix the deprecated option`,
    );
  }
}

if (failures.length > 0) {
  console.error('Deprecated TypeScript configuration detected:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Checked ${tsconfigFiles.length} TypeScript config files.`);
