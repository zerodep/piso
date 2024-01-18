import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: './src/index.js',
    plugins: [commonjs()],
    output: [
      {
        file: './lib/index.cjs',
        exports: 'named',
        format: 'cjs',
        // footer: 'module.exports = Object.assign(exports.default, exports);',
      },
    ],
  },
];
