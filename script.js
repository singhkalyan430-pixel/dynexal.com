// Global Dynexal branding normalization
(function(){
  document.querySelectorAll('header .logo').forEach(logo=>{
    const mark=logo.querySelector('.logo-mark');
    if(!mark) return;
    const text=[...logo.children].find(el=>el!==mark);
    if(text) text.textContent='Dynexal Technologies';
  });
})();

// Mobile navigation
(function(){
  const menuBtn=document.querySelector('.menu-btn');
  const nav=document.querySelector('.nav');
  if(!menuBtn||!nav) return;
  menuBtn.setAttribute('aria-expanded','false');
  menuBtn.addEventListener('click',()=>{
    const open=nav.style.display==='flex';
    nav.style.display=open?'none':'flex';
    nav.style.position='absolute';
    nav.style.top='72px';
    nav.style.left='0';
    nav.style.right='0';
    nav.style.padding='20px';
    nav.style.background='#0b1220';
    nav.style.flexDirection='column';
    nav.style.gap='18px';
    menuBtn.setAttribute('aria-expanded',String(!open));
  });
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
    if(window.innerWidth<=800){
      nav.style.display='none';
      menuBtn.setAttribute('aria-expanded','false');
    }
  }));
})();

// Google Analytics 4
(function(){
  const measurementId='G-M2JGL0B9K1';
  window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('js',new Date());
  gtag('config',measurementId);
  const s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;
  document.head.appendChild(s);
})();

// Hero slideshow
(function(){
  const slides=[...document.querySelectorAll('.hero-slide')];
  const dots=[...document.querySelectorAll('.slide-dot')];
  const prev=document.querySelector('.slide-btn.prev');
  const next=document.querySelector('.slide-btn.next');
  const slideshow=document.querySelector('.hero-slideshow');
  if(!slides.length) return;
  let current=0;
  let timer;
  function showSlide(index){
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      slide.classList.toggle('active',i===current);
      slide.setAttribute('aria-hidden',i===current?'false':'true');
    });
    dots.forEach((dot,i)=>{
      dot.classList.toggle('active',i===current);
      dot.setAttribute('aria-selected',i===current?'true':'false');
    });
  }
  function restart(){
    clearInterval(timer);
    timer=setInterval(()=>showSlide(current+1),5000);
  }
  if(next) next.addEventListener('click',()=>{showSlide(current+1);restart();});
  if(prev) prev.addEventListener('click',()=>{showSlide(current-1);restart();});
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{showSlide(i);restart();}));
  if(slideshow){
    slideshow.addEventListener('mouseenter',()=>clearInterval(timer));
    slideshow.addEventListener('mouseleave',restart);
    slideshow.addEventListener('focusin',()=>clearInterval(timer));
    slideshow.addEventListener('focusout',()=>{if(!slideshow.contains(document.activeElement)) restart();});
  }
  document.addEventListener('keydown',event=>{
    if(!slideshow||(!slideshow.matches(':hover')&&!slideshow.contains(document.activeElement))) return;
    if(event.key==='ArrowRight'){showSlide(current+1);restart();}
    if(event.key==='ArrowLeft'){showSlide(current-1);restart();}
  });
  showSlide(0);
  restart();
})();

// Tutorial category filters
(function(){
  const filters=[...document.querySelectorAll('.filters .filter')];
  const posts=[...document.querySelectorAll('.post-grid .post')];
  if(!filters.length||!posts.length) return;
  const map={'All Tutorials':'all','AL Development':'AL DEVELOPMENT','Reports':'REPORTING','Integrations':'INTEGRATION','AI':'AI'};
  filters.forEach(filter=>{
    filter.setAttribute('role','button');
    filter.setAttribute('tabindex','0');
    filter.setAttribute('aria-pressed',filter.classList.contains('active')?'true':'false');
    const apply=()=>{
      const selected=map[filter.textContent.trim()]||'all';
      filters.forEach(f=>{const active=f===filter;f.classList.toggle('active',active);f.setAttribute('aria-pressed',active?'true':'false');});
      posts.forEach(post=>{const tag=(post.querySelector('.tag')?.textContent||'').toUpperCase();const matches=selected==='all'||tag.includes(selected)||(selected==='INTEGRATION'&&tag.includes('E-COMMERCE'));post.hidden=!matches;});
    };
    filter.addEventListener('click',apply);
    filter.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();apply();}});
  });
})();

// Internal topic navigation for article pages
(function(){
  if(!location.pathname.includes('/articles/')) return;
  const path=location.pathname.toLowerCase();
  let hub,label;
  if(path.includes('rdlc')){hub='../topics/rdlc-business-central.html';label='RDLC Reporting Hub';}
  else if(path.includes('api')||path.includes('oauth')||path.includes('httpclient')||path.includes('json')||path.includes('webhook')){hub='../topics/business-central-api.html';label='Business Central API & Integration Hub';}
  else {hub='../topics/al-development.html';label='AL Development Hub';}
  const navEl=document.querySelector('.nav');
  if(navEl&&!navEl.querySelector('[data-topic-hub]')){
    const a=document.createElement('a');a.href=hub;a.textContent='Topic Hubs';a.dataset.topicHub='true';navEl.appendChild(a);
  }
  const main=document.querySelector('main');
  if(main&&!main.querySelector('[data-topic-banner]')){
    const bar=document.createElement('div');bar.dataset.topicBanner='true';bar.style.cssText='max-width:900px;margin:0 auto 24px;padding:14px 18px;border:1px solid #dfe6ef;border-radius:12px;background:#f7f9fc;font-size:14px;color:#526176;';bar.innerHTML='<strong style="color:#172033">Explore this topic:</strong> <a href="'+hub+'" style="color:#315fc9;font-weight:800;text-decoration:none">'+label+' →</a>';main.insertBefore(bar,main.firstChild);
  }
})();

// Dynexal AI Assistant
(function(){
  if(document.getElementById('dynexal-ai-launcher')) return;
  const API_URL='https://dynexal-ai-assistant.vercel.app/api/chat';
  const MAX_RETRIES=2;const MAX_HISTORY=6;const history=[];
  const style=document.createElement('style');style.textContent=`#dynexal-ai-launcher{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;background:linear-gradient(135deg,#1d4ed8,#06b6d4);color:#fff;padding:13px 18px;font:700 14px/1 system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.30);cursor:pointer}#dynexal-ai-launcher:hover{transform:translateY(-1px);box-shadow:0 15px 34px rgba(0,0,0,.36)}#dynexal-ai-panel{position:fixed;right:22px;bottom:78px;width:min(390px,calc(100vw - 28px));height:min(600px,calc(100vh - 110px));z-index:9999;display:none;flex-direction:column;background:#0b1220;color:#eaf2ff;border:1px solid #263a5b;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}@media(max-width:600px){#dynexal-ai-launcher{right:14px;bottom:14px}#dynexal-ai-panel{right:10px;bottom:68px;width:calc(100vw - 20px);height:min(70vh,600px)}}`;
  document.head.appendChild(style);
  const launcher=document.createElement('button');launcher.id='dynexal-ai-launcher';launcher.type='button';launcher.setAttribute('aria-label','Open Dynexal AI Assistant');launcher.textContent='🤖 Ask Dynexal AI';
  document.body.appendChild(launcher);
  launcher.addEventListener('click',()=>{window.open('https://dynexal-ai-assistant.vercel.app','_blank','noopener');});
})();
