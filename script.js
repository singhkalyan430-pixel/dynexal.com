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
    slideshow.addEventListener('focusout',()=>{
      if(!slideshow.contains(document.activeElement)) restart();
    });
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
  const map={
    'All Tutorials':'all',
    'AL Development':'AL DEVELOPMENT',
    'Reports':'REPORTING',
    'Integrations':'INTEGRATION',
    'AI':'AI'
  };
  filters.forEach(filter=>{
    filter.setAttribute('role','button');
    filter.setAttribute('tabindex','0');
    filter.setAttribute('aria-pressed',filter.classList.contains('active')?'true':'false');
    const apply=()=>{
      const selected=map[filter.textContent.trim()]||'all';
      filters.forEach(f=>{
        const active=f===filter;
        f.classList.toggle('active',active);
        f.setAttribute('aria-pressed',active?'true':'false');
      });
      posts.forEach(post=>{
        const tag=(post.querySelector('.tag')?.textContent||'').toUpperCase();
        const matches=selected==='all'||tag.includes(selected)||(selected==='INTEGRATION'&&tag.includes('E-COMMERCE'));
        post.hidden=!matches;
      });
    };
    filter.addEventListener('click',apply);
    filter.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();apply();}
    });
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
    const a=document.createElement('a');
    a.href=hub;
    a.textContent='Topic Hubs';
    a.dataset.topicHub='true';
    navEl.appendChild(a);
  }
  const main=document.querySelector('main');
  if(main&&!main.querySelector('[data-topic-banner]')){
    const bar=document.createElement('div');
    bar.dataset.topicBanner='true';
    bar.style.cssText='max-width:900px;margin:0 auto 24px;padding:14px 18px;border:1px solid #dfe6ef;border-radius:12px;background:#f7f9fc;font-size:14px;color:#526176;';
    bar.innerHTML='<strong style="color:#172033">Explore this topic:</strong> <a href="'+hub+'" style="color:#315fc9;font-weight:800;text-decoration:none">'+label+' →</a>';
    main.insertBefore(bar,main.firstChild);
  }
})();

// Dynexal AI Assistant
(function(){
  if(document.getElementById('dynexal-ai-launcher')) return;

  const API_URL='https://dynexal-ai-assistant.vercel.app/api/chat';

  const style=document.createElement('style');
  style.textContent=`
    #dynexal-ai-launcher{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;background:linear-gradient(135deg,#1d4ed8,#06b6d4);color:#fff;padding:13px 18px;font:700 14px/1 system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.30);cursor:pointer}
    #dynexal-ai-launcher:hover{transform:translateY(-1px);box-shadow:0 15px 34px rgba(0,0,0,.36)}
    #dynexal-ai-panel{position:fixed;right:22px;bottom:78px;width:min(390px,calc(100vw - 28px));height:min(600px,calc(100vh - 110px));z-index:9999;display:none;flex-direction:column;background:#0b1220;color:#eaf2ff;border:1px solid #263a5b;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
    #dynexal-ai-head{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;background:linear-gradient(135deg,#101d36,#0e2942);border-bottom:1px solid #263a5b}
    #dynexal-ai-head strong{font-size:15px}.dynexal-ai-sub{font-size:11px;color:#91a4c2;margin-top:3px}
    #dynexal-ai-close{border:0;background:transparent;color:#b9c7dc;font-size:20px;cursor:pointer}
    #dynexal-ai-messages{flex:1;overflow-y:auto;padding:14px}
    .dynexal-ai-msg{max-width:86%;padding:10px 12px;margin:0 0 10px;border-radius:14px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
    .dynexal-ai-bot{background:#13223a;border:1px solid #243c60;margin-right:auto}.dynexal-ai-user{background:#1d4ed8;color:#fff;margin-left:auto}
    #dynexal-ai-quick{display:flex;gap:7px;overflow-x:auto;padding:0 12px 10px;scrollbar-width:thin}
    .dynexal-ai-q{white-space:nowrap;border:1px solid #2a4267;background:#101c31;color:#cfe0f8;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}
    .dynexal-ai-q:hover{background:#172a46}
    #dynexal-ai-form{display:flex;gap:8px;padding:12px;border-top:1px solid #263a5b;background:#0a111e}
    #dynexal-ai-input{min-width:0;flex:1;border:1px solid #2a4267;border-radius:12px;background:#111c2e;color:#fff;padding:10px 11px;outline:none}
    #dynexal-ai-input:focus{border-color:#3b82f6}.dynexal-ai-input::placeholder{color:#8091ab}
    #dynexal-ai-send{border:0;border-radius:12px;background:#2563eb;color:#fff;padding:0 14px;font-weight:700;cursor:pointer}
    #dynexal-ai-send:disabled{opacity:.6;cursor:wait}
    @media(max-width:600px){#dynexal-ai-launcher{right:14px;bottom:14px}#dynexal-ai-panel{right:10px;bottom:68px;width:calc(100vw - 20px);height:min(70vh,600px)}}
  `;
  document.head.appendChild(style);

  const launcher=document.createElement('button');
  launcher.id='dynexal-ai-launcher';
  launcher.type='button';
  launcher.setAttribute('aria-label','Open Dynexal AI Assistant');
  launcher.textContent='🤖 Ask Dynexal AI';

  const panel=document.createElement('section');
  panel.id='dynexal-ai-panel';
  panel.setAttribute('aria-label','Dynexal AI Assistant');
  panel.innerHTML=`
    <div id="dynexal-ai-head">
      <div><strong>🤖 Dynexal AI</strong><div class="dynexal-ai-sub">Business Central • AL • Integrations • AI</div></div>
      <button id="dynexal-ai-close" type="button" aria-label="Close Dynexal AI">×</button>
    </div>
    <div id="dynexal-ai-messages"></div>
    <div id="dynexal-ai-quick">
      <button class="dynexal-ai-q" type="button">Event Subscriber?</button>
      <button class="dynexal-ai-q" type="button">Custom API?</button>
      <button class="dynexal-ai-q" type="button">HttpClient?</button>
      <button class="dynexal-ai-q" type="button">RDLC Reports?</button>
    </div>
    <form id="dynexal-ai-form">
      <input id="dynexal-ai-input" type="text" maxlength="2000" autocomplete="off" placeholder="Ask a Business Central question..." />
      <button id="dynexal-ai-send" type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const messages=panel.querySelector('#dynexal-ai-messages');
  const input=panel.querySelector('#dynexal-ai-input');
  const form=panel.querySelector('#dynexal-ai-form');
  const close=panel.querySelector('#dynexal-ai-close');
  const send=panel.querySelector('#dynexal-ai-send');

  function addMessage(text,type){
    const element=document.createElement('div');
    element.className='dynexal-ai-msg '+(type==='user'?'dynexal-ai-user':'dynexal-ai-bot');
    element.textContent=text;
    messages.appendChild(element);
    messages.scrollTop=messages.scrollHeight;
    return element;
  }

  addMessage('Hi! I\'m Dynexal AI 👋\n\nAsk me about Microsoft Dynamics 365 Business Central, AL, APIs, integrations, RDLC, Shopify or AI.','bot');

  launcher.addEventListener('click',()=>{
    panel.style.display='flex';
    input.focus();
  });

  close.addEventListener('click',()=>{
    panel.style.display='none';
  });

  panel.querySelectorAll('.dynexal-ai-q').forEach(button=>{
    button.addEventListener('click',()=>{
      input.value=button.textContent.trim();
      form.requestSubmit();
    });
  });

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const message=input.value.trim();
    if(!message) return;

    addMessage(message,'user');
    input.value='';
    input.disabled=true;
    send.disabled=true;

    const loading=addMessage('Thinking…','bot');

    try{
      const response=await fetch(API_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message})
      });

      const data=await response.json();
      loading.remove();

      if(!response.ok) throw new Error(data.error||'AI request failed.');

      addMessage(data.answer||'Sorry, I could not generate an answer.','bot');
    }catch(error){
      loading.textContent='Sorry, the AI assistant is temporarily unavailable. Please try again.';
      console.error('Dynexal AI error:',error);
    }finally{
      input.disabled=false;
      send.disabled=false;
      input.focus();
    }
  });
})();
