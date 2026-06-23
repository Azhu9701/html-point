/* ============================================================
   HTML Point · Presenter (演示模式增强)
   注入到 /view 路由: 演讲者备注 · 计时器 · 逐条展示 · PDF 导出
   ============================================================ */
(function(){
'use strict';
if(window.__PPT_PRESENTER_LOADED__) return;
window.__PPT_PRESENTER_LOADED__ = true;

// ═══════════════════════════════════════════════════════════════
// 1. CSS 注入
// ═══════════════════════════════════════════════════════════════
const CSS=`
/* ── 演示工具栏 (左下角, 半透明, hover 显形) ── */
#ppt-pres-bar{position:fixed;left:16px;bottom:16px;z-index:99999;display:flex;gap:6px;align-items:center;background:rgba(20,20,22,.85);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:6px 10px;font-family:-apple-system,"PingFang SC",sans-serif;font-size:12px;color:#fff;opacity:.35;transition:opacity .2s}
#ppt-pres-bar:hover{opacity:1}
#ppt-pres-bar button{background:rgba(44,44,46,.9);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap}
#ppt-pres-bar button:hover{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35}
#ppt-pres-bar .sp{width:1px;height:16px;background:rgba(255,255,255,.15);margin:0 2px}
#ppt-pres-bar .timer{color:#ff6b35;font-weight:600;font-variant-numeric:tabular-nums;min-width:64px;text-align:center;font-size:13px}
#ppt-pres-bar .counter{color:#aaa;font-size:11px;font-variant-numeric:tabular-nums}

/* ── 演讲者备注浮层 ── */
#ppt-notes{position:fixed;left:16px;bottom:60px;z-index:99998;max-width:520px;max-height:40vh;background:rgba(20,20,22,.95);backdrop-filter:blur(16px);border:1px solid rgba(255,107,53,.4);border-radius:10px;padding:14px 18px;font-family:-apple-system,"PingFang SC",sans-serif;color:#fff;font-size:14px;line-height:1.6;display:none;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.5)}
#ppt-notes.on{display:block}
#ppt-notes .nh{color:#ff6b35;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
#ppt-notes .nb{white-space:pre-wrap;word-break:break-word;color:#e0e0e0}
#ppt-notes .ne{color:#666;font-style:italic;font-size:12px}

/* ── 计时器全屏模式 (按 T 切换大字计时) ── */
#ppt-big-timer{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100000;font-size:120px;font-weight:200;color:#ff6b35;font-variant-numeric:tabular-nums;font-family:-apple-system,"SF Mono",monospace;text-shadow:0 4px 40px rgba(0,0,0,.6);display:none;pointer-events:none}
#ppt-big-timer.on{display:block}

/* ── 逐条展示 (Fragment): 未揭示的元素半透明 ── */
.ppt-frag{opacity:0!important;transition:opacity .4s ease,transform .4s ease}
.ppt-frag.ppt-frag-on{opacity:1!important}
.ppt-frag.ppt-frag-up{transform:translateY(20px)}
.ppt-frag.ppt-frag-up.ppt-frag-on{transform:translateY(0)}
.ppt-frag.ppt-frag-left{transform:translateX(-20px)}
.ppt-frag.ppt-frag-left.ppt-frag-on{transform:translateX(0)}

/* ── PDF 打印样式 ── */
@media print{
  @page{size:landscape;margin:0}
  html,body{overflow:visible!important;width:auto!important;height:auto!important;background:#fff!important}
  #deck{position:static!important;width:auto!important;height:auto!important;display:block!important;transform:none!important;transition:none!important}
  #deck > section.slide{width:100vw!important;height:100vh!important;page-break-after:always;break-after:page;page-break-inside:avoid;break-inside:avoid;transform:none!important;opacity:1!important;display:block!important}
  #deck > section.slide:last-child{page-break-after:auto}
  /* 隐藏所有编辑器/演示 UI */
  #ppt-pres-bar,#ppt-notes,#ppt-big-timer,#nav,#hint,.ppt-page-controls,#ppt-bar,#ppt-sb,#ppt-in,#ppt-gd,#ppt-zm,#ppt-to{display:none!important}
  /* 强制所有动画元素可见 */
  [data-anim]{opacity:1!important;transform:none!important}
  .ppt-frag{opacity:1!important;transform:none!important}
  canvas.bg{display:none!important}
}
`;
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:CSS}));

// ═══════════════════════════════════════════════════════════════
// 2. 状态管理
// ═══════════════════════════════════════════════════════════════
const state={
  notesOn:false,       // 备注浮层开关
  bigTimerOn:false,    // 大字计时器开关
  timerStart:null,     // 计时开始时间
  timerElapsed:0,      // 累计已计时 (暂停时累加)
  timerRunning:false,  // 计时是否运行中
  fragIndex:0,         // 当前 slide 的 fragment 揭示进度
  fragEnabled:false,   // 当前 slide 是否有 fragment
};

function toast(m,t=2000){
  let e=document.getElementById('ppt-pres-toast');
  if(!e){e=document.createElement('div');e.id='ppt-pres-toast';e.style.cssText='position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:100001;background:rgba(20,20,22,.95);color:#fff;border:1px solid #ff6b35;border-radius:8px;padding:8px 16px;font-size:13px;font-family:-apple-system,sans-serif;opacity:0;transition:opacity .2s;pointer-events:none';document.body.appendChild(e);}
  e.textContent=m;e.style.opacity='1';clearTimeout(e._t);e._t=setTimeout(()=>e.style.opacity='0',t);
}

// ═══════════════════════════════════════════════════════════════
// 3. UI 构建
// ═══════════════════════════════════════════════════════════════
function buildUI(){
  if(document.getElementById('ppt-pres-bar'))return;
  // 工具栏
  const bar=document.createElement('div');bar.id='ppt-pres-bar';
  bar.innerHTML=
    '<span class="counter" id="ppt-page-cnt">1 / 1</span>'+
    '<span class="sp"></span>'+
    '<span class="timer" id="ppt-timer">00:00</span>'+
    '<button id="pt-timer" title="开始/暂停计时 (T)">▶ 计时</button>'+
    '<span class="sp"></span>'+
    '<button id="pt-notes" title="演讲者备注 (N)">📝 备注</button>'+
    '<button id="pt-frag" title="逐条展示模式 (F)">⚡ 逐条</button>'+
    '<span class="sp"></span>'+
    '<button id="pt-pdf" title="导出 PDF (P)">📄 PDF</button>'+
    '<button id="pt-fs" title="全屏 (F11)">⛶ 全屏</button>';
  document.body.appendChild(bar);

  // 备注浮层
  const notes=document.createElement('div');notes.id='ppt-notes';
  notes.innerHTML='<div class="nh">演讲者备注</div><div class="nb" id="ppt-notes-body"></div>';
  document.body.appendChild(notes);

  // 大字计时器
  const bt=document.createElement('div');bt.id='ppt-big-timer';bt.textContent='00:00';
  document.body.appendChild(bt);
}

// ═══════════════════════════════════════════════════════════════
// 4. 计时器
// ═══════════════════════════════════════════════════════════════
function fmtTime(ms){
  const s=Math.floor(ms/1000);
  const mm=String(Math.floor(s/60)).padStart(2,'0');
  const ss=String(s%60).padStart(2,'0');
  return mm+':'+ss;
}
let timerRAF=null;
function tickTimer(){
  if(!state.timerRunning)return;
  const now=Date.now();
  const total=state.timerElapsed+(now-state.timerStart);
  const txt=fmtTime(total);
  const t1=document.getElementById('ppt-timer');
  const t2=document.getElementById('ppt-big-timer');
  if(t1)t1.textContent=txt;
  if(t2)t2.textContent=txt;
  timerRAF=requestAnimationFrame(tickTimer);
}
function toggleTimer(){
  const btn=document.getElementById('pt-timer');
  if(state.timerRunning){
    // 暂停
    state.timerElapsed+=Date.now()-state.timerStart;
    state.timerRunning=false;
    cancelAnimationFrame(timerRAF);
    if(btn)btn.textContent='▶ 继续';
  }else{
    // 开始/继续
    state.timerStart=Date.now();
    state.timerRunning=true;
    tickTimer();
    if(btn)btn.textContent='⏸ 暂停';
  }
}
function toggleBigTimer(){
  state.bigTimerOn=!state.bigTimerOn;
  const bt=document.getElementById('ppt-big-timer');
  if(bt)bt.classList.toggle('on',state.bigTimerOn);
}

// ═══════════════════════════════════════════════════════════════
// 5. 演讲者备注
// ═══════════════════════════════════════════════════════════════
function getCurrentSlide(){
  const idx=window.__currentSlideIndex||0;
  const slides=document.querySelectorAll('#deck > section.slide');
  return {idx,el:slides[idx],total:slides.length};
}
function toggleNotes(){
  state.notesOn=!state.notesOn;
  const n=document.getElementById('ppt-notes');
  if(n)n.classList.toggle('on',state.notesOn);
  if(state.notesOn)updateNotes();
}
function updateNotes(){
  const{el}=getCurrentSlide();
  const body=document.getElementById('ppt-notes-body');
  if(!el||!body)return;
  // 读取 data-notes 属性 或 .speaker-notes 元素
  let notes=el.getAttribute('data-notes')||'';
  const sn=el.querySelector('.speaker-notes');
  if(!notes&&sn)notes=sn.textContent.trim();
  if(notes){body.innerHTML=escapeHTML(notes).replace(/\n/g,'<br>');body.classList.remove('ne');}
  else{body.textContent='（本页无备注。在编辑模式下选中幻灯片，点击「备注」按钮添加。）';body.classList.add('ne');}
}
function escapeHTML(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ═══════════════════════════════════════════════════════════════
// 6. 逐条展示 (Fragment)
// ═══════════════════════════════════════════════════════════════
// 扫描当前 slide 中带 [data-frag] 的元素，初始隐藏，按 → 逐步揭示
function scanFragments(){
  const{el}=getCurrentSlide();
  if(!el)return;
  const frags=el.querySelectorAll('[data-frag]');
  state.fragEnabled=frags.length>0;
  state.fragIndex=0;
  // 初始化: 全部隐藏
  frags.forEach((f,i)=>{
    f.classList.add('ppt-frag');
    const type=f.getAttribute('data-frag');
    if(type==='up')f.classList.add('ppt-frag-up');
    else if(type==='left')f.classList.add('ppt-frag-left');
    f.classList.remove('ppt-frag-on');
  });
}
// 返回 true 表示消费了 fragment (不翻页)，false 表示已全部揭示 (可以翻页)
function advanceFragment(){
  if(!state.fragEnabled)return false;
  const{el}=getCurrentSlide();
  const frags=el.querySelectorAll('[data-frag]:not(.ppt-frag-on)');
  if(frags.length===0){state.fragEnabled=false;return false;}
  frags[0].classList.add('ppt-frag-on');
  state.fragIndex++;
  return true;
}
// 返回 true 表示回退了一个 fragment
function retreatFragment(){
  if(state.fragIndex<=0)return false;
  const{el}=getCurrentSlide();
  const frags=[...el.querySelectorAll('[data-frag].ppt-frag-on)')];
  // 取最后一个已揭示的
  const all=[...el.querySelectorAll('[data-frag].ppt-frag-on')];
  if(all.length===0)return false;
  all[all.length-1].classList.remove('ppt-frag-on');
  state.fragIndex--;
  state.fragEnabled=true;
  return true;
}

// ═══════════════════════════════════════════════════════════════
// 7. PDF 导出
// ═══════════════════════════════════════════════════════════════
function exportPDF(){
  // 确保所有 fragment 可见
  document.querySelectorAll('.ppt-frag').forEach(f=>f.classList.add('ppt-frag-on'));
  // 揭示所有动画元素
  document.querySelectorAll('[data-anim]').forEach(e=>{e.style.opacity='1';e.style.transform='none';});
  toast('正在准备 PDF…请在弹出窗口选择「另存为 PDF」',3000);
  setTimeout(()=>{
    document.body.classList.add('ppt-printing');
    window.print();
    setTimeout(()=>document.body.classList.remove('ppt-printing'),1000);
  },300);
}

// ═══════════════════════════════════════════════════════════════
// 8. 全屏
// ═══════════════════════════════════════════════════════════════
function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
  }else{
    document.exitFullscreen().catch(()=>{});
  }
}

// ═══════════════════════════════════════════════════════════════
// 8.5. 公共模块 (导航+动画 fallback 由 core.js 提供)
// ═══════════════════════════════════════════════════════════════
// setupBuiltinNav + setupBuiltinAnim 已提取到 web/core.js,
// init() 调用 __pptCore.setup() — 若演示稿自带 go()/playSlide 则自动让位。

// ═══════════════════════════════════════════════════════════════
// 9. 更新页码 + 导航钩子
// ═══════════════════════════════════════════════════════════════
function updatePageCount(){
  const{idx,total}=getCurrentSlide();
  const c=document.getElementById('ppt-page-cnt');
  if(c)c.textContent=(idx+1)+' / '+total;
}
// 包装 go() 以在每次翻页后刷新状态
function hookNavigation(){
  const orig=window.go;
  if(!orig||orig.__pptHooked)return;
  const wrapped=function(n){
    orig(n);
    updatePageCount();
    if(state.notesOn)updateNotes();
    scanFragments();
  };
  wrapped.__pptHooked=true;
  window.go=wrapped;
}

// ═══════════════════════════════════════════════════════════════
// 10. 键盘绑定
// ═══════════════════════════════════════════════════════════════
function bindKeys(){
  document.addEventListener('keydown',e=>{
    // 不干扰输入框
    if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;

    // → / Space / PageDown: 优先 fragment, 否则翻页
    if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'||e.key==='ArrowDown'){
      if(state.fragEnabled&&advanceFragment()){e.preventDefault();return;}
      e.preventDefault();
      const cur=window.__currentSlideIndex||0;
      if(typeof window.go==='function')window.go(cur+1);
    }
    // ← / PageUp: 优先回退 fragment, 否则翻页
    if(e.key==='ArrowLeft'||e.key==='PageUp'||e.key==='ArrowUp'){
      if(retreatFragment()){e.preventDefault();return;}
      e.preventDefault();
      const cur=window.__currentSlideIndex||0;
      if(typeof window.go==='function')window.go(cur-1);
    }
    if(e.key==='Home'){e.preventDefault();if(typeof window.go==='function')window.go(0);}
    if(e.key==='End'){e.preventDefault();
      const slides=document.querySelectorAll('#deck > section.slide');
      if(typeof window.go==='function')window.go(slides.length-1);}
    // 功能键
    if(e.key==='n'||e.key==='N'){e.preventDefault();toggleNotes();}
    if(e.key==='t'||e.key==='T'){e.preventDefault();toggleBigTimer();}
    if(e.key==='f'||e.key==='F'){
      // 避免与浏览器全屏冲突，仅在有 fragment 时切换逐条
      const{el}=getCurrentSlide();
      if(el&&el.querySelectorAll('[data-frag]').length>0){
        e.preventDefault();toast('逐条展示已激活: → 揭示下一条',2000);
      }
    }
    if(e.key==='p'||e.key==='P'){e.preventDefault();exportPDF();}
    if(e.key==='Escape'){
      if(state.bigTimerOn){toggleBigTimer();return;}
      if(state.notesOn){toggleNotes();return;}
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// 11. 初始化
// ═══════════════════════════════════════════════════════════════
function init(){
  if(window.__pptCore)window.__pptCore.setup();
  buildUI();
  hookNavigation();
  bindKeys();
  updatePageCount();
  scanFragments();

  // 绑定按钮
  document.getElementById('pt-timer').onclick=toggleTimer;
  document.getElementById('pt-notes').onclick=toggleNotes;
  document.getElementById('pt-frag').onclick=()=>{
    const{el}=getCurrentSlide();
    if(el&&el.querySelectorAll('[data-frag]').length>0){
      toast('逐条展示: 按 → 逐条揭示，← 回退',2500);
    }else{
      toast('本页无逐条元素。在编辑器中给元素加 data-frag 属性即可。',3000);
    }
  };
  document.getElementById('pt-pdf').onclick=exportPDF;
  document.getElementById('pt-fs').onclick=toggleFullscreen;

  // 欢迎提示
  setTimeout(()=>toast('演示就绪 · N备注 · T计时 · →翻页/逐条 · P导出PDF',3500),800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
