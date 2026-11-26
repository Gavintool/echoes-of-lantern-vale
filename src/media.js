const files = import.meta.glob('./assets/*', { eager: true, query: '?url&no-inline', import: 'default' });

export function art(name) {
  return files['./assets/' + name];
}
