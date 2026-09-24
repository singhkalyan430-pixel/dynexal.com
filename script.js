// Dynexal global branding — consistent D mark + wordmark
(function(){
  document.querySelectorAll('header .logo, footer .logo').forEach(logo=>{
    let mark=logo.querySelector('.logo-mark');
    if(!mark){
      mark=document.createElement('span');
      mark.className='logo-mark';
      mark.setAttribute('aria-hidden','true');
      logo.insertBefore(mark,logo.firstChild);
    }
    let copy=logo.querySelector('.logo-copy');
    if(!copy){
      const spans=[...logo.children].filter(el=>el.tagName==='SPAN' && el!==mark);
      const text=spans.map(el=>el.textContent.trim()).join(' ').trim() || 'Dynexal Technologies';
      spans.forEach(el=>el.remove());
      copy=document.createElement('span');
      copy.className='logo-copy';
      copy.innerHTML='<strong></strong><small></small>';
      copy.querySelector('strong').textContent=text;
      logo.appendChild(copy);
    }
    const strong=copy.querySelector('strong');
    const small=copy.querySelector('small');
    if(strong)strong.textContent='Dynexal Technologies';
    if(small)small.textContent='Learn | Build | Integrate | Grow';
  });
})();

// Shared global navigation — one plain, consistent structure on every page
(function(){
  const nav=document.querySelector('.nav');
  if(!nav)return;
  const segments=window.location.pathname.split('/').filter(Boolean);
  const depth=segments.length && !window.location.pathname.endsWith('/') ? Math.max(0,segments.length-1) : 0;
  const root='../'.repeat(depth);
  const links=[
    {label:'Home',href:root+'index.html',key:'home'},
    {label:'Tutorials',href:root+'tutorials.html',key:'tutorials',menu:[
      ['AL Development',root+'topics/al-development.html'],
      ['Reports & RDLC',root+'topics/rdlc-business-central.html'],
      ['APIs & Integrations',root+'articles/business-central-api-integration.html'],
      ['AI + Business Central',root+'articles/ai-business-central-complete-guide.html']
    ]},
    {label:'Services',href:root+'services.html',key:'services',menu:[
      ['Business Central Development',root+'services.html#development'],
      ['Integration Services',root+'services.html#integration'],
      ['AI Solutions',root+'services.html#ai']
    ]},
    {label:'Portfolio',href:root+'portfolio.html',key:'portfolio',menu:[
      ['All Projects',root+'portfolio.html'],
      ['E-commerce Integration',root+'projects/ecommerce-integration.html'],
      ['Role Center Dashboard',root+'projects/role-center-dashboard.html'],
      ['Reporting Toolkit',root+'projects/rdlc-reporting-toolkit.html'],
      ['API Integration',root+'projects/api-integration.html']
    ]},
    {label:'Topics',href:root+'index.html#topics',key:'topics',menu:[
      ['AL Development',root+'topics/al-development.html'],
      ['Business Central API',root+'topics/business-central-api.html'],
      ['Reports & RDLC',root+'topics/rdlc-business-central.html']
    ]},
    {label:'About',href:root+'about.html',key:'about'}
  ];
  const path=window.location.pathname.toLowerCase();
  let current='home';
  if(path.includes('/articles/')||path.endsWith('/tutorials.html'))current='tutorials';
  else if(path.includes('/topics/'))current='topics';
  else if(path.includes('/projects/')||path.endsWith('/portfolio.html'))current='portfolio';
  else if(path.endsWith('/services.html'))current='services';
  else if(path.endsWith('/about.html'))current='about';
  nav.innerHTML='';
  links.forEach(item=>{
    if(item.menu){
      const wrap=document.createElement('div');
      wrap.className='has-dropdown';
      const a=document.createElement('a');
      a.href=item.href;
      a.textContent=item.label;
      if(item.key===current){a.classList.add('active');a.setAttribute('aria-current','page')}
      const menu=document.createElement('div');
      menu.className='dropdown-menu';
      menu.setAttribute('role','menu');
      item.menu.forEach(([label,href])=>{
        const sub=document.createElement('a');
        sub.href=href;
        sub.textContent=label;
        sub.setAttribute('role','menuitem');
        menu.appendChild(sub);
      });
      wrap.append(a,menu);
      nav.appendChild(wrap);
    }else{
      const a=document.createElement('a');
      a.href=item.href;
      a.textContent=item.label;
      if(item.key===current){a.classList.add('active');a.setAttribute('aria-current','page')}
      nav.appendChild(a);
    }
  });
})();

// Global dark/light mode switch
(function(){
  const nav=document.querySelector('.nav');
  if(!nav)return;
  const saved=localStorage.getItem('dynexal-theme');
  const preferred=saved || (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.setAttribute('data-theme',preferred);

  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='theme-toggle';
  toggle.setAttribute('aria-label',preferred==='dark'?'Switch to light mode':'Switch to dark mode');
  toggle.setAttribute('title',preferred==='dark'?'Light mode':'Dark mode');
  toggle.innerHTML='<span class="theme-icon" aria-hidden="true">'+(preferred==='dark'?'☀':'☾')+'</span><span class="theme-label">'+(preferred==='dark'?'Light':'Dark')+'</span>';

  nav.appendChild(toggle);

  const apply=(theme)=>{
    document.documentElement.setAttribute('data-theme',theme);
    localStorage.setItem('dynexal-theme',theme);
    const dark=theme==='dark';
    toggle.querySelector('.theme-icon').textContent=dark?'☀':'☾';
    toggle.querySelector('.theme-label').textContent=dark?'Light':'Dark';
    toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
    toggle.setAttribute('title',dark?'Light mode':'Dark mode');
  };

  toggle.addEventListener('click',()=>apply(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'));
})(); 

// Plain desktop navigation — no dropdowns, no arrows
(function(){
  const nav=document.querySelector('.nav');
  if(!nav)return;
  const style=document.createElement('style');
  style.textContent=`
    .site-header .logo{display:flex!important;align-items:center!important;gap:11px!important;white-space:nowrap!important}
    .site-header .logo-mark,.footer .logo-mark{display:block!important;width:42px!important;height:42px!important;flex:0 0 42px!important;background:url('/assets/dynexal-mark.svg') center/contain no-repeat!important;color:transparent!important;font-size:0!important}
    .site-header .logo-copy{display:flex!important;flex-direction:column!important;line-height:1.08!important}
    .site-header .logo-copy strong{font-size:23px!important;letter-spacing:-.7px!important;color:#fff!important}
    .site-header .logo-copy small{margin-top:5px!important;font-size:11px!important;font-weight:500!important;color:#9eb0c7!important;letter-spacing:.2px!important}
    .footer .logo-copy{display:flex!important;flex-direction:column!important;line-height:1.08!important}
    .footer .logo-copy strong{font-size:18px!important;color:#fff!important}
    .footer .logo-copy small{margin-top:4px!important;font-size:10px!important;color:#91a0b6!important;font-weight:500!important}
    .site-header .nav .nav-arrow{display:none!important}
    @media(min-width:901px){
      .site-header .nav{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:31px!important;font-size:17px!important;white-space:nowrap!important;overflow:visible!important}
      .site-header .nav>a{height:82px!important;display:flex!important;align-items:center!important;position:relative!important;color:#cbd5e1!important}
      .site-header .nav>a:hover,.site-header .nav>a:focus-visible{color:#fff!important}
      .site-header .nav>a.active:after{content:""!important;display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;height:3px!important;border-radius:4px!important;background:#0aa5ff!important}
    }
    @media(max-width:900px){
      .site-header .logo-mark,.footer .logo-mark{width:34px!important;height:34px!important;flex-basis:34px!important}
      .site-header .logo-copy strong{font-size:20px!important}
      .site-header .logo-copy small{font-size:10px!important}
    }
  `;
  document.head.appendChild(style);
})();

// Mobile navigation
(function(){
  const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(!btn||!nav)return;
  btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',()=>{
    const open=nav.style.display==='flex';
    nav.style.display=open?'none':'flex';
    nav.style.position='absolute';nav.style.top='72px';nav.style.left='0';nav.style.right='0';
    nav.style.padding='20px';nav.style.background='#0b1220';nav.style.flexDirection='column';nav.style.gap='18px';
    btn.setAttribute('aria-expanded',String(!open));
  });
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{
    if(innerWidth>900)return;
    const isDropdownParent=a.parentElement?.classList.contains('has-dropdown');
    const isSubmenuLink=a.closest('.dropdown-menu');
    if(isDropdownParent&&!isSubmenuLink){
      e.preventDefault();
      a.parentElement.classList.toggle('mobile-open');
      return;
    }
    nav.style.display='none';
    btn.setAttribute('aria-expanded','false');
  }));
})();

// Portfolio visual polish
(function(){
  if(!location.pathname.toLowerCase().endsWith('/portfolio.html'))return;
  const style=document.createElement('style');style.textContent=`
  .portfolio-page{background:#f7f9fc}
  .portfolio-hero{position:relative;overflow:hidden}
  .portfolio-hero:before{background:linear-gradient(90deg,rgba(4,28,50,.98) 0%,rgba(7,48,79,.91) 48%,rgba(7,48,79,.64) 100%),url('https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=2200&q=80') center/cover no-repeat!important}
  .portfolio-hero>*{position:relative;z-index:1}
  .case-meta{display:flex!important;flex-wrap:wrap!important;gap:8px!important}
  .case-meta span{white-space:nowrap}
  `;document.head.appendChild(style);
})();

// Google Analytics 4
(function(){
  const id='G-M2JGL0B9K1';window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config',id);
  const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(s);
})();

// Hero slideshow
(function(){
  const slides=[...document.querySelectorAll('.hero-slide')],dots=[...document.querySelectorAll('.slide-dot')];
  if(!slides.length)return;let current=0,timer;
  const show=i=>{current=(i+slides.length)%slides.length;slides.forEach((s,n)=>{s.classList.toggle('active',n===current);s.setAttribute('aria-hidden',n===current?'false':'true')});dots.forEach((d,n)=>{d.classList.toggle('active',n===current);d.setAttribute('aria-selected',n===current?'true':'false')})};
  const restart=()=>{clearInterval(timer);timer=setInterval(()=>show(current+1),5000)};
  document.querySelector('.slide-btn.next')?.addEventListener('click',()=>{show(current+1);restart()});
  document.querySelector('.slide-btn.prev')?.addEventListener('click',()=>{show(current-1);restart()});
  dots.forEach((d,n)=>d.addEventListener('click',()=>{show(n);restart()}));show(0);restart();
})();

// Tutorial filters
(function(){
  const filters=[...document.querySelectorAll('.filters .filter')],posts=[...document.querySelectorAll('.post-grid .post')];
  if(!filters.length||!posts.length)return;
  const map={'All Tutorials':'all','AL Development':'AL DEVELOPMENT','Reports':'REPORTING','Integrations':'INTEGRATION','AI':'AI'};
  filters.forEach(f=>{f.addEventListener('click',()=>{const key=map[f.textContent.trim()]||'all';filters.forEach(x=>x.classList.toggle('active',x===f));posts.forEach(p=>{const tag=(p.querySelector('.tag')?.textContent||'').toUpperCase();p.hidden=key!=='all'&&!tag.includes(key)})})});
})();

// Dynexal AI Assistant
(function(){
  if(document.getElementById('dynexal-ai-launcher'))return;
  const API='/api/chat',history=[];
  const style=document.createElement('style');style.textContent=`
  #dynexal-ai-launcher{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;background:linear-gradient(135deg,#1d4ed8,#06b6d4);color:#fff;padding:14px 19px;font:700 14px system-ui;box-shadow:0 12px 30px rgba(0,0,0,.3);cursor:pointer}
  #dynexal-ai-panel{position:fixed;right:22px;bottom:78px;width:min(400px,calc(100vw - 28px));height:min(600px,calc(100vh - 110px));z-index:9999;display:none;flex-direction:column;background:#0b1220;color:#eaf2ff;border:1px solid #263a5b;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden;font-family:system-ui,sans-serif}
  #dynexal-ai-head{display:flex;justify-content:space-between;align-items:center;padding:15px 16px;background:#101d36;border-bottom:1px solid #263a5b}.ai-sub{font-size:11px;color:#91a4c2;margin-top:3px}
  #dynexal-ai-messages{flex:1;overflow:auto;padding:14px}.ai-msg{max-width:86%;padding:10px 12px;margin-bottom:10px;border-radius:14px;font-size:13px;line-height:1.55;white-space:pre-wrap}.ai-bot{background:#13223a;border:1px solid #243c60}.ai-user{background:#1d4ed8;margin-left:auto}.ai-source{display:block;color:#7db2ff;font-size:11px;margin:5px 0}
  #dynexal-ai-quick{display:flex;gap:7px;overflow:auto;padding:0 12px 10px}.ai-q{white-space:nowrap;border:1px solid #2a4267;background:#101c31;color:#cfe0f8;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}
  #dynexal-ai-form{display:flex;gap:8px;padding:12px;border-top:1px solid #263a5b;background:#0a111e}#dynexal-ai-input{flex:1;min-width:0;border:1px solid #2a4267;border-radius:12px;background:#111c2e;color:#fff;padding:10px;outline:none}#dynexal-ai-send{border:0;border-radius:12px;background:#2563eb;color:#fff;padding:0 14px;font-weight:700}.ai-close{border:0;background:none;color:#b9c7dc;font-size:22px;cursor:pointer}.ai-reset{border:1px solid #2a4267;background:#101c31;color:#bcd5ff;border-radius:8px;padding:5px 8px;font-size:10px;cursor:pointer}
  @media(max-width:600px){#dynexal-ai-launcher{right:14px;bottom:14px}#dynexal-ai-panel{right:10px;bottom:68px;width:calc(100vw - 20px);height:70vh}}
  `;document.head.appendChild(style);
  const launch=document.createElement('button');launch.id='dynexal-ai-launcher';launch.textContent='🤖 Ask Dynexal AI';launch.setAttribute('aria-label','Open Dynexal AI');
  const panel=document.createElement('section');panel.id='dynexal-ai-panel';panel.innerHTML=`<div id="dynexal-ai-head"><div><strong>🤖 Dynexal AI</strong><div class="ai-sub">Business Central • AL • Integrations • AI</div></div><div><button class="ai-reset">New Chat</button> <button class="ai-close" aria-label="Close">×</button></div></div><div id="dynexal-ai-messages"></div><div id="dynexal-ai-quick"><button class="ai-q">Event Subscriber?</button><button class="ai-q">Custom API?</button><button class="ai-q">HttpClient?</button><button class="ai-q">RDLC Reports?</button></div><form id="dynexal-ai-form"><input id="dynexal-ai-input" maxlength="2000" autocomplete="off" placeholder="Ask a Business Central question..."><button id="dynexal-ai-send">Send</button></form>`;
  document.body.append(launch,panel);
  const messages=panel.querySelector('#dynexal-ai-messages'),input=panel.querySelector('#dynexal-ai-input'),form=panel.querySelector('#dynexal-ai-form');
  const add=(text,type='bot')=>{const d=document.createElement('div');d.className='ai-msg '+(type==='user'?'ai-user':'ai-bot');d.textContent=text;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;return d};
  const reset=()=>{history.length=0;messages.innerHTML='';add("Hi! I'm Dynexal AI 👋\n\nAsk me about Business Central, AL, APIs, integrations, RDLC, Shopify or AI.");input.focus()};
  const ask=async q=>{const loading=add('Thinking…');try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:history.slice(-6)})});const data=await r.json();if(!r.ok)throw Error(data.error||'AI request failed');loading.remove();add(data.answer||'I could not generate an answer.');if(Array.isArray(data.sources)&&data.sources.length){const box=document.createElement('div');box.className='ai-msg ai-bot';box.innerHTML='<strong>📚 Related Dynexal tutorials</strong>';data.sources.forEach(s=>{if(s?.url){const a=document.createElement('a');a.className='ai-source';a.href=s.url;a.textContent=s.title+' →';box.appendChild(a)}});messages.appendChild(box)}history.push({role:'user',parts:[{text:q}]},{role:'model',parts:[{text:data.answer||''}]});}catch(e){loading.textContent='Sorry, I could not connect to Dynexal AI. Please try again.'}};
  launch.addEventListener('click',()=>{panel.style.display='flex';if(!messages.children.length)reset();input.focus()});panel.querySelector('.ai-close').addEventListener('click',()=>panel.style.display='none');panel.querySelector('.ai-reset').addEventListener('click',reset);
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;add(q,'user');input.value='';ask(q)});
  panel.querySelectorAll('.ai-q').forEach(b=>b.addEventListener('click',()=>{const q=b.textContent.trim();add(q,'user');ask(q)}));
})();


// Homepage automatic hero carousel — smooth right-to-left track
(function(){
  const track=document.querySelector('.hero-slider-track');
  const slides=[...document.querySelectorAll('.hero-slide-full')];
  const dots=[...document.querySelectorAll('.hero-slider-dot')];
  if(!track||slides.length<2)return;

  let current=0;
  let timer=null;

  slides.forEach((slide)=>{
    slide.classList.remove('active','slide-out-left');
    slide.style.transform='';
    slide.style.visibility='';
    slide.style.opacity='';
  });

  track.style.transform='translate3d(0,0,0)';

  const update=()=>{
    track.style.transform='translate3d('+(-current*33.3333333333)+'%,0,0)';
    slides.forEach((s,n)=>s.classList.toggle('active',n===current));
    dots.forEach((d,n)=>{
      d.classList.toggle('active',n===current);
      d.setAttribute('aria-selected',n===current?'true':'false');
    });
  };

  const goTo=(index)=>{
    current=(index+slides.length)%slides.length;
    update();
  };

  const restart=()=>{
    clearInterval(timer);
    timer=setInterval(()=>goTo(current+1),5000);
  };

  dots.forEach((dot,n)=>{
    dot.addEventListener('click',()=>{
      goTo(n);
      restart();
    });
  });

  update();
  restart();
})();
