import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = process.cwd();
const skipDirs = new Set(['.git', '.github', 'node_modules']);

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function cleanHtml(html) {
  return html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
    .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
    .replace(/<svg[\\s\\S]*?<\\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\\s+/g, ' ')
    .trim();
}

function getTitle(html) {
  const match = html.match(/<title>([\\s\\S]*?)<\\/title>/i);
  return match ? cleanHtml(match[1]) : '';
}

function getMeta(html, name) {
  const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'));
  return match ? match[1].trim() : '';
}

function getCanonical(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function getHeadings(html) {
  return [...html.matchAll(/<h[1-3][^>]*>([\\s\\S]*?)<\\/h[1-3]>/gi)]
    .map(match => cleanHtml(match[1]))
    .filter(Boolean)
    .slice(0, 50);
}

function getLastModified(relativePath) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', relativePath], { encoding: 'utf8' }).trim() || new Date().toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function publicUrl(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') return 'https://dynexal.com/';
  if (relative.endsWith('/index.html')) return `https://dynexal.com/${relative.slice(0, -10)}`;
  return `https://dynexal.com/${relative}`;
}

const htmlFiles = walk(root)
  .filter(file => file.endsWith('.html'))
  .filter(file => !file.endsWith(`${path.sep}404.html`));

const articles = htmlFiles
  .filter(file => file.includes(`${path.sep}articles${path.sep}`))
  .map(file => {
    const html = fs.readFileSync(file, 'utf8');
    const headings = getHeadings(html);
    const title = getTitle(html);
    const description = getMeta(html, 'description');
    const url = getCanonical(html) || publicUrl(file);
    const content = cleanHtml(html).slice(0, 9000);
    const keywordSource = [title, description, ...headings].join(' ').toLowerCase();
    const keywords = [...new Set(
      keywordSource
        .split(/[^a-z0-9+.#-]+/)
        .filter(word => word.length >= 3)
    )].slice(0, 80);

    return {
      title,
      url,
      description,
      keywords,
      headings,
      content
    };
  })
  .filter(article => article.title && article.url);

fs.mkdirSync(path.join(root, 'api'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'api', 'knowledge.json'),
  JSON.stringify(articles, null, 2) + '\\n'
);

const urls = htmlFiles
  .map(file => ({
    url: publicUrl(file),
    lastmod: getLastModified(path.relative(root, file).replaceAll(path.sep, '/'))
  }))
  .sort((a, b) => a.url.localeCompare(b.url));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(item => `  <url><loc>${item.url}</loc><lastmod>${item.lastmod}</lastmod></url>`),
  '</urlset>',
  ''
].join('\\n');

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`Dynexal automation: ${articles.length} articles indexed for AI knowledge and ${urls.length} HTML URLs included in sitemap.`);
