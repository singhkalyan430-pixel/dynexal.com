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


for path in [p for p in ROOT.rglob('*.html') if '.git' not in p.parts and 'node_modules' not in p.parts]:
    text = path.read_text(encoding='utf-8')
    original = text

    text = re.sub(r'<nav class="nav"[^>]*>[\s\S]*?</nav>', nav_for(path), text, count=1)

    text = re.sub(
        r'(<header[\s\S]*?<a class="logo"[^>]*>)[\s\S]*?(</a>)',
        r'\1<span class="logo-mark" aria-hidden="true"></span><span class="logo-copy"><strong>Dynexal Technologies</strong><small>Learn | Build | Integrate | Grow</small></span>\2',
        text,
        count=1,
    )

    text = re.sub(r'<script id="dynexal-nav-href-fix">[\s\S]*?</script>\s*', '', text)
    text = re.sub(
        r'<script\s+src=["\']([^"\']*script\.js)(?:\?[^"\']*)?["\']\s*></script>',
        r'<script src="\1?v=20260915-navfix"></script>',
        text,
    )
    text = text.replace('</body>', FIX_SCRIPT + '\n</body>', 1)

    if text != original:
        path.write_text(text, encoding='utf-8')
        print(path)
