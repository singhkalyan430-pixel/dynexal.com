const menuBtn=document.querySelector('.menu-btn');const nav=document.querySelector('.nav');if(menuBtn){menuBtn.addEventListener('click',()=>{nav.style.display=nav.style.display==='flex'?'none':'flex';nav.style.position='absolute';nav.style.top='72px';nav.style.left='0';nav.style.right='0';nav.style.padding='20px';nav.style.background='#0b1220';nav.style.flexDirection='column';});}

// Google Analytics 4
(function(){const measurementId='G-M2JGL0B9K1';window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',measurementId);const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;document.head.appendChild(s);})();

// Internal topic navigation for article pages
(function(){
  if(!location.pathname.includes('/articles/')) return;
  const path=location.pathname.toLowerCase();
  let hub,label;
  if(path.includes('rdlc')){hub='../topics/rdlc-business-central.html';label='RDLC Reporting Hub';}
  else if(path.includes('api')||path.includes('oauth')||path.includes('httpclient')||path.includes('json')||path.includes('webhook')){hub='../topics/business-central-api.html';label='Business Central API & Integration Hub';}
  else {hub='../topics/al-development.html';label='AL Development Hub';}
  const navEl=document.querySelector('.nav');
  if(navEl&&!navEl.querySelector('[data-topic-hub]')){const a=document.createElement('a');a.href=hub;a.textContent='Topic Hubs';a.dataset.topicHub='true';navEl.appendChild(a);}
  const main=document.querySelector('main');
  if(main&&!main.querySelector('[data-topic-banner]')){const bar=document.createElement('div');bar.dataset.topicBanner='true';bar.style.cssText='max-width:900px;margin:0 auto 24px;padding:14px 18px;border:1px solid #dfe6ef;border-radius:12px;background:#f7f9fc;font-size:14px;color:#526176;';bar.innerHTML='<strong style="color:#172033">Explore this topic:</strong> <a href="'+hub+'" style="color:#315fc9;font-weight:800;text-decoration:none">'+label+' →</a>';main.insertBefore(bar,main.firstChild);}
})();