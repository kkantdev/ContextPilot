#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');
const tsxPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

if (fs.existsSync(distPath)) {
  require(distPath);
} else {
  // Use tsx on the fly if dist does not exist yet during local dev
  try {
    require('tsx/cli');
  } catch (e) {
    console.error('ContextPilot build not found. Run `npm run build` or `npm run dev`.');
    process.exit(1);
  }
}
