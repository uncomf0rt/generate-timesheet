import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/index.cjs',
  format: 'cjs',
  external: ['express', 'vite', 'dotenv', 'axios'],
}).catch(() => process.exit(1));
