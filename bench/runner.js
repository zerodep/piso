import { Bench } from 'tinybench';

/**
 * Run a named benchmark suite and print the result table
 * @param {string} title suite title
 * @param {Record<string, () => any>} cases map of case name -> function to benchmark
 */
export async function runSuite(title, cases) {
  const bench = new Bench({ name: title, time: 500 });

  for (const [name, fn] of Object.entries(cases)) {
    bench.add(name, fn);
  }

  await bench.run();

  console.log(`\n${title}`);
  console.table(bench.table());
}
