import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const articlesDir = path.join(root, 'articles');
const visuals = [
  { match: ['business-central-api','api-error','api-query','api-filters','api-pagination','api-rate-limits','custom-api-page'], file: '../assets/tutorial-diagrams/api-flow.svg', alt: 'Business Central API request flow diagram', heading: 'How the API flow works' },
  { match: ['webhooks'], file: '../assets/tutorial-diagrams/webhook-flow.svg', alt: 'Business Central webhook flow diagram', heading: 'Webhook flow at a glance' },
  { match: ['oauth'], file: '../assets/tutorial-diagrams/oauth-flow.svg', alt: 'OAuth 2.0 authentication flow for Business Central integrations', heading: 'OAuth 2.0 flow at a glance' },
  { match: ['rdlc'], file: '../assets/tutorial-diagrams/rdlc-flow.svg', alt: 'Business Central RDLC report rendering flow diagram', heading: 'RDLC flow at a glance' }
];
if (!fs.existsSync(articlesDir)) process.exit(0);
for (const name of fs.readdirSync(articlesDir)) {
  if (!name.endsWith('.html')) continue;
  const filePath = path.join(articlesDir, name);
  let html = fs.readFileSync(filePath, 'utf8');
  const lower = name.toLowerCase();
  const visual = visuals.find(v => v.match.some(token => lower.includes(token)));
  if (!visual) continue;
  const marker = `data-dynexal-visual="${visual.file}"`;
  if (html.includes(marker)) continue;
  const block = `\n<section class="dynexal-tutorial-visual" ${marker}>\n  <h2>${visual.heading}</h2>\n  <figure><img src="${visual.file}" alt="${visual.alt}" loading="lazy" decoding="async"><figcaption>Visual guide — Dynexal</figcaption></figure>\n</section>\n`;
  const articleBody = html.indexOf('<article class="article-body">');
  if (articleBody === -1) continue;
  const insertAt = articleBody + '<article class="article-body">'.length;
  html = html.slice(0, insertAt) + block + html.slice(insertAt);
  const style = `<style>.dynexal-tutorial-visual{margin:0 0 34px;padding:20px;border:1px solid #dfe6ef;border-radius:16px;background:#f7f9fc}.dynexal-tutorial-visual h2{margin:0 0 14px!important;font-size:24px!important}.dynexal-tutorial-visual figure{margin:0}.dynexal-tutorial-visual img{display:block;width:100%;height:auto;border-radius:12px}.dynexal-tutorial-visual figcaption{margin-top:8px;text-align:center;color:#718096;font-size:12px}</style>`;
  html = html.replace('</head>', `${style}\n</head>`);
  fs.writeFileSync(filePath, html);
  console.log(`Added visual to ${name}`);
}
