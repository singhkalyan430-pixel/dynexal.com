from pathlib import Path
import re

ROOT = Path('.')
FIX_SCRIPT = '''<script id="dynexal-nav-href-fix">
(function(){
  document.querySelectorAll('.dropdown-menu a').forEach(function(a){
    var href = a.getAttribute('href');
    if (!href || href[0] == '/' || href[0] == '#' || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;
    a.setAttribute('href', '/' + href.replace(/^\.\//, ''));
  });
})();
</script>'''


def nav_for(path):
    prefix = '../' * len(path.parent.parts)
    return f'''<nav class="nav" aria-label="Main navigation">
<a href="{prefix}index.html">Home</a>
<a href="{prefix}tutorials.html">Tutorials</a>
<a href="{prefix}services.html">Services</a>
<a href="{prefix}portfolio.html">Portfolio</a>
<a href="{prefix}index.html#topics">Topics</a>
<a href="{prefix}about.html">About</a>
</nav>'''


def script_for(path):
    prefix = '../' * len(path.parent.parts)
    return f'<script src="{prefix}script.js?v=20260915-navfix"></script>'


for path in [p for p in ROOT.rglob('*.html') if '.git' not in p.parts and 'node_modules' not in p.parts]:
    text = path.read_text(encoding='utf-8')
    original = text

    # One consistent global navigation everywhere. Dropdowns are added by script.js on desktop.
    text = re.sub(r'<nav class="nav"[^>]*>[\s\S]*?</nav>', nav_for(path), text, count=1)

    # Ensure every normal page has the same mobile navigation control.
    if '<button class="menu-btn"' not in text and '<nav class="nav"' in text:
        text = re.sub(
            r'(<nav class="nav"[^>]*>[\s\S]*?</nav>)',
            r'\1<button class="menu-btn" aria-label="Open menu" aria-expanded="false">☰</button>',
            text,
            count=1,
        )

    # One consistent wordmark everywhere; never show the D icon in the header/footer.
    text = re.sub(
        r'(<header[\s\S]*?<a class="logo"[^>]*>)[\s\S]*?(</a>)',
        r'\1<span class="logo-copy"><strong>Dynexal Technologies</strong><small>Learn | Build | Integrate | Grow</small></span>\2',
        text,
        count=1,
    )
    text = re.sub(
        r'(<footer[\s\S]*?<a class="logo"[^>]*>)[\s\S]*?(</a>)',
        r'\1<span class="logo-copy"><strong>Dynexal Technologies</strong><small>Learn | Build | Integrate | Grow</small></span>\2',
        text,
        count=1,
    )

    # Remove legacy logo marks and old navigation helper scripts.
    text = re.sub(r'<span class="logo-mark"[^>]*>.*?</span>', '', text, flags=re.S)
    text = re.sub(r'<script id="dynexal-nav-href-fix">[\s\S]*?</script>\s*', '', text)

    # Load the shared navigation/branding runtime on every page that has a body.
    text = re.sub(r'<script\s+src=["\']([^"\']*script\.js)(?:\?[^"\']*)?["\']\s*</script>', script_for(path), text)
    if '<script src=' in text and 'script.js' not in text:
        pass
    elif '<nav class="nav"' in text and 'script.js' not in text:
        text = text.replace('</body>', script_for(path) + '\n</body>', 1)

    # Keep the global navigation stylesheet on all normal pages.
    if '<nav class="nav"' in text and 'nav-plain.css' not in text:
        text = text.replace('</head>', '<link rel="stylesheet" href="/nav-plain.css?v=20260915-global2">\n</head>', 1)

    text = text.replace('</body>', FIX_SCRIPT + '\n</body>', 1)

    if text != original:
        path.write_text(text, encoding='utf-8')
        print(path)
