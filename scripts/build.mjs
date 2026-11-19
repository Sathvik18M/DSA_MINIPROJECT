import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('dist/src', { recursive: true });
for (const file of ['index.html', 'styles.css', 'favicon.svg', 'src/game.js', 'src/app.js']) {
  await copyFile(file, `dist/${file}`);
}
await copyFile('LICENSE', 'dist/LICENSE');
console.log('Built Fieldwork into dist/');
