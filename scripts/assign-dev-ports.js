import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appsDir = path.join(__dirname, '../apps');
const apps = fs.readdirSync(appsDir).filter(f => {
  return fs.statSync(path.join(appsDir, f)).isDirectory();
}).sort();

apps.forEach((app, index) => {
  const wranglerPath = path.join(appsDir, app, 'wrangler.toml');
  if (!fs.existsSync(wranglerPath)) return;

  let content = fs.readFileSync(wranglerPath, 'utf8');
  const port = 8801 + index;
  const inspectorPort = 10241 + index;

  const devBlock = `\n[dev]\nport = ${port}\ninspector_port = ${inspectorPort}\n`;

  if (/\[dev\]/.test(content)) {
    content = content.replace(/\[dev\][\s\S]*?(?=(\n\[|$))/, (match) => {
      let updated = match;
      if (/port\s*=/.test(updated)) {
        updated = updated.replace(/port\s*=\s*\d+/, `port = ${port}`);
      } else {
        updated += `port = ${port}\n`;
      }
      if (/inspector_port\s*=/.test(updated)) {
        updated = updated.replace(/inspector_port\s*=\s*\d+/, `inspector_port = ${inspectorPort}`);
      } else {
        updated += `inspector_port = ${inspectorPort}\n`;
      }
      return updated;
    });
  } else {
    content = content.trimEnd() + '\n' + devBlock;
  }

  fs.writeFileSync(wranglerPath, content, 'utf8');
  console.log(`Assigned to ${app}: port ${port}, inspector_port ${inspectorPort}`);
});
console.log('Successfully updated all wrangler.toml development ports!');