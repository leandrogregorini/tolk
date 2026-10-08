import { readFileSync, writeFileSync } from 'node:fs';

const pluginPath = '.claude-plugin/plugin.json';
const marketplacePath = '.claude-plugin/marketplace.json';

const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
const match = String(plugin.version ?? '').match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  throw new Error(
    `plugin.json version must be MAJOR.MINOR.PATCH, got ${plugin.version}`,
  );
}

const current = `${match[1]}.${match[2]}.${match[3]}`;
const next = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;

const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
const entry = marketplace.plugins?.find((item) => item.name === plugin.name);
if (!entry) {
  throw new Error(`marketplace.json has no plugin named ${plugin.name}`);
}
if (entry.version !== current) {
  throw new Error(
    `marketplace.json version ${entry.version} does not match plugin.json version ${current}`,
  );
}

for (const path of [pluginPath, marketplacePath]) {
  const text = readFileSync(path, 'utf8');
  const needle = `"version": "${current}"`;
  if (text.split(needle).length - 1 !== 1) {
    throw new Error(`${path} does not contain exactly one ${needle}`);
  }
  writeFileSync(path, text.replace(needle, `"version": "${next}"`));
}

console.log(next);
