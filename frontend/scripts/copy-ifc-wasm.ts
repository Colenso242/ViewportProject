// Copies the wasm binaries from the web-ifc version that web-ifc-three
// actually resolves into public/, so the runtime wasm always matches the
// JS API version. Also copies the IFC parsing web worker. Runs on postinstall,
// executed directly by Node's native type stripping — keep the syntax
// erasable-only (no enums, namespaces, or parameter properties).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const ifcThreeDir = path.dirname(require.resolve('web-ifc-three/package.json'));
const wasmDir = path.dirname(require.resolve('web-ifc/package.json', { paths: [ifcThreeDir] }));
const publicDir = path.join(scriptDir, '..', 'public');

for (const file of ['web-ifc.wasm', 'web-ifc-mt.wasm']) {
  fs.copyFileSync(path.join(wasmDir, file), path.join(publicDir, file));
  console.log(`Copied ${file} from ${wasmDir}`);
}

for (const file of ['IFCWorker.js', 'IFCWorker.js.map']) {
  const source = path.join(ifcThreeDir, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(publicDir, file));
    console.log(`Copied ${file} from ${ifcThreeDir}`);
  }
}
