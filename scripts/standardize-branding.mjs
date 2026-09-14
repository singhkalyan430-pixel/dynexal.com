import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  const original = html;

  // Remove the visible D logo mark from every page.
  html = html.replace(/<span class="logo-mark">D<\/span>/g, '');
  html = html.replace(/<span class="logo-mark"><\/span>/g, '');

  // Keep the same full brand name everywhere, including article/tutorial pages.
  html = html.replace(/<span>Dynexal<\/span>/g, '<span>Dynexal Technologies</span>');
  html = html.replace(/<span>Dynexal Technologies<\/span><\/a>/g, '<span>Dynexal Technologies</span></a>');

  if (html !== original) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

console.log(`Standardized branding on ${changed} HTML file(s).`);
