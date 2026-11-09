import { rmSync } from 'node:fs';

// This directory is a generated Sites Worker bundle, not a public Netlify asset.
rmSync(new URL('../dist/server', import.meta.url), { recursive: true, force: true });
