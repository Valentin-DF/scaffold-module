function generateComponentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = '';
  for (let i = 0; i < 22; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function toPascalCase(s) {
  return (s || '')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join('');
}

function toCamelCase(s) {
  const pascal = toPascalCase(s);
  return pascal.length > 0 ? pascal[0].toLowerCase() + pascal.slice(1) : '';
}

function toGoPackageName(s) {
  return s.replace(/-/g, '_');
}

function snakeToPascal(tag) {
  return (tag || '')
    .split('_')
    .map((s) => (s.length > 0 ? s[0].toUpperCase() + s.slice(1).toLowerCase() : ''))
    .join('');
}

module.exports = { generateComponentId, toPascalCase, toCamelCase, toGoPackageName, snakeToPascal };
