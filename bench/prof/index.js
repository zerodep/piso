import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const libs = ['piso', 'luxon'];

/**
 * Run one parse script under `node --prof`, then `node --prof-process` the log it wrote
 * @param {string} lib script name without extension
 * @returns {{ticks: number, seconds: number, profile: string}} tick count, wall time including process start, and the processed profile path
 */
function profile(lib) {
  const cwd = mkdtempSync(join(tmpdir(), `piso-prof-${lib}-`));

  const started = performance.now();
  const run = spawnSync(process.execPath, ['--prof', join(dir, `${lib}.js`)], { cwd, stdio: 'inherit' });
  const seconds = (performance.now() - started) / 1000;
  if (run.status !== 0) throw new Error(`${lib} exited with ${run.status}`);

  const log = readdirSync(cwd).find((f) => f.startsWith('isolate-') && f.endsWith('.log'));
  if (!log) throw new Error(`no isolate log in ${cwd}`);

  const ticks = readFileSync(join(cwd, log), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('tick,')).length;

  const processed = spawnSync(process.execPath, ['--prof-process', join(cwd, log)], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (processed.status !== 0) throw new Error(`prof-process of ${lib} exited with ${processed.status}`);
  const profile = join(cwd, `${lib}.txt`);
  writeFileSync(profile, processed.stdout);

  return { ticks, seconds, profile };
}

const result = {};
for (const lib of libs) {
  result[lib] = profile(lib);
  console.log(`${lib}: ${result[lib].ticks} ticks, ${result[lib].seconds.toFixed(2)} s, profile in ${result[lib].profile}`);
}

const ratio = result.luxon.ticks / result.piso.ticks;
const cell = ({ ticks, seconds }) => `${ticks} ticks, ${seconds.toFixed(2)} s`;
console.log(`\n| ${process.versions.node} | ${cell(result.piso)} | ${cell(result.luxon)} | ${ratio.toFixed(1)}× |`);
