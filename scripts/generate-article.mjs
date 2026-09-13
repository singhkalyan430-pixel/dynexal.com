import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queuePath = path.join(root, 'content-queue.json');
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) throw new Error('GEMINI_API_KEY is required.');

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const item = (queue.topics || []).find(x => x.status === 'ready');
if (!item) {
  console.log('No ready topic in content queue.');
  process.exit(0);
}

const prompt = `You are the senior technical editor for Dynexal, a practical Microsoft Dynamics 365 Business Central and AL development learning site.

Create ONE original, technically accurate, human-sounding tutorial for this topic:
${item.topic}

Target keywords: ${(item.keywords || []).join(', ')}
Category: ${item.category}

Return ONLY valid JSON with these keys:
{
  "title": "SEO-friendly title",
  "slug": "lowercase-hyphenated-slug",
  "description": "150-160 character meta description",
  "excerpt": "2 sentence card excerpt",
  "bodyHtml": "complete article body as HTML fragment",
  "tags": ["tag1", "tag2", "tag3"],
  "visuals": [
    {
      "afterHeading": "exact heading text from the article",
      "title": "short visual title",
      "alt": "descriptive accessible alt text",
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}

Editorial requirements:
- 1400-2200 words.
- Practical developer-first tutorial, not generic marketing content.
- Explain the problem, concept, architecture/flow, implementation, AL examples, testing, common errors and best practices.
- Use valid Business Central AL syntax where code is shown. Do not invent APIs, objects, methods or properties.
- Prefer current Business Central terminology and clearly label conceptual/pseudocode examples.
- Include headings as <h2> and <h3>, paragraphs as <p>, lists as <ul>/<ol>, and code as <pre><code>...</code></pre>.
- Include at least one realistic AL code example.
- Include a short FAQ section with 3-5 questions.
- Do not include <html>, <head>, <body>, <script>, <style>, markdown fences or external citations.
- Escape HTML-sensitive characters inside code blocks.
- Do not claim Dynexal has tested something unless the prompt provides that fact.
- Do not copy wording from other sites.

Visual aid requirements:
- Add 0-3 visuals only where a diagram materially improves understanding. Do not add visuals just for decoration.
- Use visuals for architecture, request/response flow, integration flow, lifecycle, troubleshooting flow, or another concept that benefits from a visual explanation.
- Each visual must reference an exact heading already present in bodyHtml.
- Each visual should have 3-6 concise steps, suitable for a clean horizontal flow diagram.
- Do NOT invent UI screenshots, product screenshots, Microsoft logos, or claims about exact screen layouts. These visuals are conceptual technical diagrams.
- If no visual is genuinely useful, return an empty visuals array.
`;

const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Return only valid JSON. No markdown fences.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 7000, responseMimeType: 'application/json' }
    })
  }
);

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Gemini request failed: ${response.status} ${text}`);
}

const data = await response.json();
const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
if (!raw) throw new Error('Gemini returned no content.');

let article;
try {
  article = JSON.parse(raw);
} catch {
  throw new Error('Gemini returned invalid JSON.');
}

for (const key of ['title', 'slug', 'description', 'excerpt', 'bodyHtml']) {
  if (!article[key] || typeof article[key] !== 'string') throw new Error(`Missing article field: ${key}`);
}

if (/<\/?(script|iframe|object|embed)\b/i.test(article.bodyHtml)) {
  throw new Error('Unsafe HTML detected in generated article.');
}

article.slug = article.slug.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
if (!article.slug) throw new Error('Invalid generated slug.');

const articlePath = path.join(root, 'articles', `${article.slug}.html`);
if (fs.existsSync(articlePath)) throw new Error(`Article already exists: ${article.slug}.html`);

const today = new Date().toISOString().slice(0, 10);
const canonical = `https://dynexal.com/articles/${article.slug}.html`;
const tags = Array.isArray(article.tags) ? article.tags.slice(0, 8) : [];
const tagText = tags.length ? tags.join(' • ') : item.category;

const visualDir = path.join(root, 'assets', 'tutorial-diagrams');
fs.mkdirSync(visualDir, { recursive: true });
const visualItems = normalizeVisuals(article.visuals);
const visuals = [];
for (let i = 0; i < visualItems.length; i++) {
  const visual = visualItems[i];
  const fileName = `${article.slug}-${i + 1}.svg`;
  fs.writeFileSync(path.join(visualDir, fileName), createDiagramSvg(visual.title, visual.steps, visual.alt));
  visuals.push({ ...visual, fileName });
}

let bodyHtml = article.bodyHtml;
for (const visual of visuals) {
  const figure = `<figure class="tutorial-visual"><img src="../assets/tutorial-diagrams/${visual.fileName}" alt="${escapeAttr(visual.alt)}" loading="lazy"><figcaption>${escapeHtml(visual.title)}</figcaption></figure>`;
  const headingPattern = new RegExp(`(<h[23]\\b[^>]*>\\s*${escapeRegExp(visual.afterHeading)}\\s*</h[23]>)`, 'i');
  if (headingPattern.test(bodyHtml)) {
    bodyHtml = bodyHtml.replace(headingPattern, `$1${figure}`);
  } else {
    console.warn(`Visual heading not found: ${visual.afterHeading}`);
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${escapeAttr(article.description)}">
<meta name="author" content="Dynexal">
<link rel="icon" type="image/svg+xml" href="../assets/dynexal-mark.svg">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${escapeAttr(article.title)}">
<meta property="og:description" content="${escapeAttr(article.description)}">
<meta property="og:site_name" content="Dynexal">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeAttr(article.title)}">
<meta name="twitter:description" content="${escapeAttr(article.description)}">
<title>${escapeHtml(article.title)} | Dynexal</title>
<link rel="stylesheet" href="../styles.css?v=20260913">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: article.title,
  description: article.description,
  author: { '@type': 'Organization', name: 'Dynexal', url: 'https://dynexal.com/' },
  publisher: { '@type': 'Organization', name: 'Dynexal', url: 'https://dynexal.com/' },
  datePublished: today,
  dateModified: today,
  mainEntityOfPage: canonical
})}</script>
<style>.article-page{padding:72px 20px 100px}.article-wrap{max-width:900px;margin:auto}.article-head{margin-bottom:38px}.article-head h1{font-size:48px;line-height:1.12;margin:12px 0 16px}.article-meta{color:#718096;font-size:14px}.article-body{font-size:17px;line-height:1.8;color:#27364a}.article-body h2{font-size:30px;line-height:1.25;margin:42px 0 14px;color:#172033}.article-body h3{font-size:23px;margin:28px 0 10px;color:#20304a}.article-body pre{overflow:auto;background:#0b1220;color:#eaf2ff;padding:18px;border-radius:12px;line-height:1.55;font-size:14px}.article-body code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.article-body a{color:#315fc9;font-weight:700}.article-body li{margin:7px 0}.article-tags{color:#426ee5;font-size:12px;font-weight:800;letter-spacing:.5px}.tutorial-visual{margin:28px 0 34px;padding:16px;border:1px solid #dfe6ef;border-radius:14px;background:#f8fafc}.tutorial-visual img{display:block;width:100%;height:auto;border-radius:10px}.tutorial-visual figcaption{margin-top:10px;font-size:13px;color:#607087;text-align:center;font-weight:700}</style>
</head>
<body>
<header class="site-header"><div class="container nav-wrap"><a class="logo" href="../index.html"><span class="logo-mark"></span><span>Dynexal</span></a><nav class="nav" aria-label="Main navigation"><a href="../index.html">Home</a><a href="../tutorials.html">Tutorials</a><a href="../services.html">Services</a><a href="../portfolio.html">Portfolio</a><a href="../index.html#topics">Topics</a><a href="../about.html">About</a></nav><button class="menu-btn" aria-label="Open menu" aria-expanded="false">☰</button></div></header>
<main class="article-page"><div class="article-wrap"><header class="article-head"><span class="section-label">DYNEXAL TECHNICAL GUIDE</span><div class="article-tags">${escapeHtml(tagText)}</div><h1>${escapeHtml(article.title)}</h1><p class="article-meta">Published ${today} · Dynexal</p></header><article class="article-body">${bodyHtml}<h2>Related Dynexal Learning</h2><p>Explore more practical Business Central and AL development tutorials on the <a href="../tutorials.html">Dynexal Tutorials hub</a>.</p></article></div></main>
<footer class="footer"><div class="container footer-wrap"><a class="logo" href="../index.html"><span class="logo-mark"></span><span>Dynexal</span></a><p>Learn Business Central. Build better solutions.</p><span><a href="../about.html">About</a> · <a href="../contact.html">Contact</a> · <a href="../privacy-policy.html">Privacy</a> · <a href="../terms.html">Terms</a> · <a href="../disclaimer.html">Disclaimer</a></span><span>© 2026 Dynexal</span></div></footer><script src="../script.js?v=20260913"></script>
</body></html>`;

fs.writeFileSync(articlePath, html);

const tutorialsPath = path.join(root, 'tutorials.html');
let tutorials = fs.readFileSync(tutorialsPath, 'utf8');
const card = `<article class="post new"><div class="icon">${escapeHtml(item.category.slice(0, 3))}</div><span class="tag">${escapeHtml(item.category)}</span><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.excerpt)}</p><a href="articles/${article.slug}.html">Read tutorial →</a></article>\n`;
const marker = '\n</div></div></main>';
const pos = tutorials.lastIndexOf(marker);
if (pos === -1) throw new Error('Tutorial grid marker not found.');
tutorials = tutorials.slice(0, pos) + '\n' + card + tutorials.slice(pos);
fs.writeFileSync(tutorialsPath, tutorials);

const sitemapPath = path.join(root, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemap.includes(canonical)) {
  const entry = `  <url><loc>${canonical}</loc><lastmod>${today}</lastmod></url>\n`;
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap);
}

item.status = 'published';
item.publishedAt = today;
item.url = canonical;
fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n');

console.log(`Published ${article.slug}.html`);
console.log(`Visual aids generated: ${visuals.length}`);

function normalizeVisuals(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(v => v && typeof v === 'object')
    .slice(0, 3)
    .map(v => ({
      afterHeading: String(v.afterHeading || '').trim(),
      title: String(v.title || 'Technical flow').trim().slice(0, 120),
      alt: String(v.alt || v.title || 'Technical diagram').trim().slice(0, 220),
      steps: Array.isArray(v.steps) ? v.steps.map(x => String(x).trim()).filter(Boolean).slice(0, 6) : []
    }))
    .filter(v => v.afterHeading && v.steps.length >= 3);
}

function createDiagramSvg(title, steps, alt) {
  const width = 1200;
  const height = 210;
  const gap = 18;
  const boxWidth = Math.floor((width - 60 - gap * (steps.length - 1)) / steps.length);
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttr(alt)}">`);
  parts.push(`<rect width="${width}" height="${height}" rx="18" fill="#0b1220"/>`);
  parts.push(`<text x="30" y="35" fill="#9cc3ff" font-family="Arial, sans-serif" font-size="17" font-weight="700">${escapeXml(title)}</text>`);
  steps.forEach((step, index) => {
    const x = 30 + index * (boxWidth + gap);
    const y = 62;
    parts.push(`<rect x="${x}" y="${y}" width="${boxWidth}" height="112" rx="14" fill="#13223a" stroke="#35527d"/>`);
    parts.push(`<circle cx="${x + 24}" cy="${y + 27}" r="14" fill="#2563eb"/>`);
    parts.push(`<text x="${x + 24}" y="${y + 33}" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="13" font-weight="700">${index + 1}</text>`);
    parts.push(`<text x="${x + 48}" y="${y + 32}" fill="#eaf2ff" font-family="Arial, sans-serif" font-size="14" font-weight="700">${escapeXml(wrapSvgText(step, Math.max(12, Math.floor(boxWidth / 8))))}</text>`);
    if (index < steps.length - 1) {
      const ax = x + boxWidth + 5;
      const ay = y + 56;
      parts.push(`<path d="M ${ax} ${ay} L ${ax + gap - 10} ${ay}" stroke="#5b8def" stroke-width="3" fill="none"/>`);
      parts.push(`<path d="M ${ax + gap - 15} ${ay - 6} L ${ax + gap - 7} ${ay} L ${ax + gap - 15} ${ay + 6}" stroke="#5b8def" stroke-width="3" fill="none"/>`);
    }
  });
  parts.push('</svg>');
  return parts.join('');
}

function wrapSvgText(value, maxChars) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4).join(' • ');
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function escapeAttr(value) { return escapeHtml(value); }
