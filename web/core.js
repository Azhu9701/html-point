/* ============================================================
   HTML Point · Core (公共模块)
   内置导航引擎 + 动画引擎 fallback + 公共工具
   注入到 /edit 和 /view: 仅当演示稿没自带 go()/playSlide 时启用
   ============================================================ */
(function(){
'use strict';
if(window.__PPT_CORE_LOADED__) return;
window.__PPT_CORE_LOADED__ = true;

// ═══════════════════════════════════════════════════════════════
// 公共工具
// ═══════════════════════════════════════════════════════════════
function toast(m,t){
  let e=document.getElementById('ppt-core-toast');
  if(!e){e=document.createElement('div');e.id='ppt-core-toast';e.style.cssText='position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:100001;background:rgba(20,20,22,.95);color:#fff;border:1px solid #ff6b35;border-radius:8px;padding:8px 16px;font-size:13px;font-family:-apple-system,sans-serif;opacity:0;transition:opacity .2s;pointer-events:none';document.body.appendChild(e);}
  e.textContent=m;e.style.opacity='1';clearTimeout(e._t);e._t=setTimeout(()=>e.style.opacity='0',t||2000);
}
function rgbHex(c){
  if(!c||c==='transparent')return'#333333';
  if(c.startsWith('#'))return c.length===4?'#'+c.slice(1).split('').map(x=>x+x).join(''):c.slice(0,7);
  const m=c.match(/\d+/g);if(!m)return'#fff';
  return'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');
}

// ═══════════════════════════════════════════════════════════════
// 内置导航引擎 (fallback)
// 仅当演示稿没自带 window.go 时启用
// ═══════════════════════════════════════════════════════════════
function setupBuiltinNav(){
  if(typeof window.go==='function'&&!window.go.__pptBuiltin)return;
  const deck=document.getElementById('deck');
  if(!deck)return;
  const slides=deck.querySelectorAll(':scope > section.slide');
  const total=slides.length;
  if(!total)return;

  let idx=0,lock=false;
  window.__currentSlideIndex=0;
  if(!deck.style.width||deck.style.width==='10000vw')deck.style.width=(total*100)+'vw';

  const go=function(n){
    if(lock)return;
    idx=Math.max(0,Math.min(total-1,n));
    window.__currentSlideIndex=idx;
    deck.style.transform='translateX('+(-idx*100)+'vw)';
    const nav=document.getElementById('nav');
    if(nav)nav.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
    lock=true;setTimeout(()=>lock=false,700);
  };
  go.__pptBuiltin=true;
  window.go=go;

  // 构建导航点 (如果 #nav 存在但为空)
  const nav=document.getElementById('nav');
  if(nav&&!nav.children.length){
    slides.forEach((s,i)=>{
      const b=document.createElement('button');b.className='dot';b.dataset.i=i;
      b.setAttribute('aria-label','Page '+(i+1));
      b.onclick=()=>go(i);nav.appendChild(b);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 内置动画引擎 (fallback)
// 仅当演示稿没自带 window.__playSlide 时启用
// ═══════════════════════════════════════════════════════════════
function setupBuiltinAnim(){
  if(typeof window.__playSlide==='function'&&!window.__playSlide.__pptBuiltin)return;
  const EASE=[0,0,.3,1];
  const slides=[...document.querySelectorAll('#deck > section.slide')];
  if(!slides.length)return;
  document.body.classList.add('motion-ready');

  const ANIM_MAP={
    line:{opacity:[0,1],y:[10,0]},up:{opacity:[0,1],y:[20,0]},down:{opacity:[0,1],y:[-20,0]},
    left:{opacity:[0,1],x:[-24,0]},right:{opacity:[0,1],x:[24,0]},
    kicker:{opacity:[0,1],y:[8,0]},title:{opacity:[0,1],y:[16,0]},
    bottom:{opacity:[0,1],y:[14,0]},lead:{opacity:[0,1],y:[12,0]},
    img:{opacity:[0,1],scale:[.96,1]},bars:{opacity:[0,1],scaleY:[.6,1]},
    kpi:{opacity:[0,1],y:[12,0]},hero:{opacity:[0,1],scale:[.92,1]},
  };
  const DEFAULT_ANIM={opacity:[0,1],y:[12,0]};

  function playSlide(i){
    const slide=slides[i];if(!slide)return;
    slide.querySelectorAll('[data-anim]').forEach(el=>{
      el.getAnimations&&el.getAnimations().forEach(a=>a.cancel());
      el.style.opacity='';el.style.transform='';
    });
    const elems=[...slide.querySelectorAll('[data-anim]')];
    elems.forEach((el,k)=>{
      const type=el.getAttribute('data-anim');
      const params=ANIM_MAP[type]||DEFAULT_ANIM;
      const kf={};
      let tFrom='',tTo='';
      Object.entries(params).forEach(([prop,[from,to]])=>{
        if(prop==='x'){tFrom+=' translateX('+from+'px)';tTo+=' translateX('+to+'px)';}
        else if(prop==='y'){tFrom+=' translateY('+from+'px)';tTo+=' translateY('+to+'px)';}
        else if(prop==='scale'){tFrom+=' scale('+from+')';tTo+=' scale('+to+')';}
        else if(prop==='scaleY'){tFrom+=' scaleY('+from+')';tTo+=' scaleY('+to+')';}
        else kf[prop]=[from,to];
      });
      if(tFrom)kf.transform=[tFrom.trim(),tTo.trim()];
      try{el.animate(kf,{duration:600,delay:k*80,easing:'cubic-bezier('+EASE.join(',')+')',fill:'forwards'});}catch(e){}
    });
    slide.querySelectorAll('.tl-node,.bar-tower,.kpi-cell,.sub-card,.col').forEach((el,k)=>{
      if(el.closest('[data-anim]'))return;
      try{el.animate({opacity:[0,1],transform:['translateY(10px)','translateY(0)']},{duration:500,delay:k*60,easing:'cubic-bezier('+EASE.join(',')+')',fill:'forwards'});}catch(e){}
    });
  }
  playSlide.__pptBuiltin=true;
  window.__playSlide=playSlide;

  // 挂钩 go(): 翻页后播放新 slide 动画
  const origGo=window.go;
  if(origGo){
    window.go=function(n){origGo(n);const idx=window.__currentSlideIndex||0;setTimeout(()=>playSlide(idx),450);};
  }
  setTimeout(()=>playSlide(window.__currentSlideIndex||0),300);
}

// ═══════════════════════════════════════════════════════════════
// 统一入口: editor.js 和 presenter.js 都调用这个
// ═══════════════════════════════════════════════════════════════
window.__pptCore={
  setup:function(){setupBuiltinNav();setupBuiltinAnim();},
  toast:toast,
  rgbHex:rgbHex,
  setupBuiltinNav:setupBuiltinNav,
  setupBuiltinAnim:setupBuiltinAnim,
};

})();
