/* eslint-disable @typescript-eslint/no-require-imports */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env.local');

function loadEnv() {
  const raw = fs.readFileSync(ENV_PATH, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const DIST = path.join(__dirname, 'dist', 'sidepanel');
  fs.mkdirSync(DIST, { recursive: true });

  const minify = process.argv.includes('--minify');

  esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'sidepanel', 'index.tsx')],
    bundle: true,
    outfile: path.join(DIST, 'sidepanel.js'),
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
    },
    minify,
    target: ['chrome110'],
    treeShaking: true,
    sourcemap: minify ? false : 'inline',
  }).then(() => {
    const srcHtml = path.join(__dirname, 'src', 'sidepanel', 'index.html');
    const dstHtml = path.join(DIST, 'index.html');
    if (fs.existsSync(srcHtml)) {
      fs.copyFileSync(srcHtml, dstHtml);
    }
    console.log('✅ Side panel built → extension/dist/sidepanel/');
  }).catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
  });
}

main();
