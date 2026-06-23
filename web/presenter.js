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


/* 新增：激光笔 */
#ppt-laser{position:fixed;width:20px;height:20px;background:#ff3b30;border-radius:50%;box-shadow:0 0 10px 4px rgba(255,59,48,.6);z-index:100000;pointer-events:none;display:none;transform:translate(-50%,-50%)}
#ppt-laser.on{display:block}
/* 新增：绘图模式 */
#ppt-draw-canvas{position:fixed;inset:0;z-index:99997;pointer-events:none}
#ppt-draw-canvas.on{pointer-events:auto}
#ppt-draw-tools{position:fixed;right:16px;bottom:60px;z-index:99998;display:none;flex-direction:column;gap:4px;background:rgba(20,20,22,.9);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
#ppt-draw-tools.on{display:flex}
#ppt-draw-tools button{background:rgba(44,44,46,.9);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit}
#ppt-draw-tools button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-draw-tools button.on{background:#ff6b35;color:#0a0a0a}
#ppt-draw-tools .dc-row{display:flex;gap:4px;align-items:center}
#ppt-draw-tools .dc-dot{width:16px;height:16px;border-radius:50%;border:2px solid transparent;cursor:pointer}
#ppt-draw-tools .dc-dot.on{border-color:#fff}
/* 新增：缩略图导航网格 */
#ppt-thumb-grid{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.85);backdrop-filter:blur(12px);display:none;flex-wrap:wrap;align-content:flex-start;justify-content:center;gap:12px;padding:40px;overflow-y:auto}
#ppt-thumb-grid.on{display:flex}
#ppt-thumb-grid .tg-item{width:240px;aspect-ratio:16/9;background:#1c1c1e;border:2px solid transparent;border-radius:8px;cursor:pointer;overflow:hidden;position:relative;transition:border-color .2s,transform .2s}
#ppt-thumb-grid .tg-item:hover{border-color:#ff6b35;transform:scale(1.03)}
#ppt-thumb-grid .tg-item.on{border-color:#ff6b35}
#ppt-thumb-grid .tg-num{position:absolute;top:6px;left:8px;background:rgba(0,0,0,.7);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
#ppt-thumb-grid .tg-clone{width:1600px;transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none}
#ppt-thumb-grid .tg-time{position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,.7);color:#ff6b35;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px}
/* 新增：跳转对话框 */
#ppt-goto{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100001;background:rgba(20,20,22,.95);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:20px;display:none;flex-direction:column;gap:10px;min-width:200px}
#ppt-goto.on{display:flex}
#ppt-goto input{background:#0a0a0a;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:8px 12px;font-size:16px;width:100%;font-family:inherit;text-align:center}
#ppt-goto .gt-hint{color:#888;font-size:11px;text-align:center}
/* 新增：排练计时器浮层 */
#ppt-rehearse{position:fixed;right:16px;top:16px;z-index:99998;display:none;flex-direction:column;gap:6px;background:rgba(20,20,22,.9);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;min-width:140px}
#ppt-rehearse.on{display:flex}
#ppt-rehearse .rh-ttl{color:#ff6b35;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
#ppt-rehearse .rh-time{color:#fff;font-size:24px;font-weight:300;font-variant-numeric:tabular-nums}
#ppt-rehearse .rh-slide{color:#888;font-size:11px}
/* 更多 fragment 动画类型 */
.ppt-frag.ppt-frag-down{transform:translateY(-20px)}
.ppt-frag.ppt-frag-down.ppt-frag-on{transform:translateY(0)}
.ppt-frag.ppt-frag-right{transform:translateX(20px)}
.ppt-frag.ppt-frag-right.ppt-frag-on{transform:translateX(0)}
.ppt-frag.ppt-frag-zoom{transform:scale(.85)}
.ppt-frag.ppt-frag-zoom.ppt-frag-on{transform:scale(1)}
.ppt-frag.ppt-frag-rotate{transform:rotate(-10deg);opacity:.5}
.ppt-frag.ppt-frag-rotate.ppt-frag-on{transform:rotate(0);opacity:1}

/* ── PDF 打印样式 ── */
@media print{
  #ppt-laser,#ppt-draw-canvas,#ppt-draw-tools,#ppt-thumb-grid,#ppt-goto,#ppt-rehearse{display:none!important}
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
  laserOn:false,       // 激光笔开关
  drawOn:false,        // 绘图模式开关
  drawColor:'#ff6b35', // 绘图颜色
  drawLineWidth:3,     // 绘图线宽
  drawHistory:[],      // 绘图历史
  rehearseOn:false,    // 排练计时模式
  slideTimes:[],      // 每页停留时间
  slideStartTime:null,// 当前页进入时间
  thumbGridOn:false,   // 缩略图导航
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
    '<button id="pt-draw" title="绘图模式 (D)">✎ 绘图</button>'+
    '<button id="pt-rehearse" title="排练计时 (R)">⏱ 排练</button>'+
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

  // 激光笔光点
  const laser=document.createElement('div');laser.id='ppt-laser';document.body.appendChild(laser);

  // 绘图 Canvas
  const drawCanvas=document.createElement('canvas');drawCanvas.id='ppt-draw-canvas';document.body.appendChild(drawCanvas);
  // 绘图工具栏
  const drawTools=document.createElement('div');drawTools.id='ppt-draw-tools';
  drawTools.innerHTML='<div class="dc-row"><span style="color:#888;font-size:10px">颜色</span></div>'+
    '<div class="dc-row">'+
    '<div class="dc-dot on" style="background:#ff6b35" data-c="#ff6b35"></div>'+
    '<div class="dc-dot" style="background:#ff3b30" data-c="#ff3b30"></div>'+
    '<div class="dc-dot" style="background:#00d4ff" data-c="#00d4ff"></div>'+
    '<div class="dc-dot" style="background:#52c41a" data-c="#52c41a"></div>'+
    '<div class="dc-dot" style="background:#fff" data-c="#ffffff"></div>'+
    '<div class="dc-dot" style="background:#000;border:1px solid #555" data-c="#000000"></div></div>'+
    '<div class="dc-row" style="margin-top:6px"><span style="color:#888;font-size:10px">粗细</span></div>'+
    '<div class="dc-row"><button data-lw="2">细</button><button data-lw="4" class="on">中</button><button data-lw="8">粗</button></div>'+
    '<div class="dc-row" style="margin-top:6px"><button id="dt-clear">清除</button><button id="dt-close">关闭</button></div>';
  document.body.appendChild(drawTools);

  // 缩略图导航网格
  const thumbGrid=document.createElement('div');thumbGrid.id='ppt-thumb-grid';document.body.appendChild(thumbGrid);

  // 跳转对话框
  const gotoDlg=document.createElement('div');gotoDlg.id='ppt-goto';
  gotoDlg.innerHTML='<input type="number" id="gt-in" min="1" placeholder="页码" autofocus><div class="gt-hint">按 Enter 跳转，Esc 取消</div>';
  document.body.appendChild(gotoDlg);

  // 排练计时器
  const rehearse=document.createElement('div');rehearse.id='ppt-rehearse';
  rehearse.innerHTML='<div class="rh-ttl">排练计时</div><div class="rh-time" id="rh-time">00:00</div><div class="rh-slide" id="rh-slide">第 1 页</div>';
  document.body.appendChild(rehearse);
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
    else if(type==='down')f.classList.add('ppt-frag-down');
    else if(type==='left')f.classList.add('ppt-frag-left');
    else if(type==='right')f.classList.add('ppt-frag-right');
    else if(type==='zoom')f.classList.add('ppt-frag-zoom');
    else if(type==='rotate')f.classList.add('ppt-frag-rotate');
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
// 新增：激光笔模式
// ═══════════════════════════════════════════════════════════════
function setupLaser(){
  const laser=document.getElementById('ppt-laser');
  document.addEventListener('keydown',e=>{
    if(e.key==='l'||e.key==='L'){
      if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      state.laserOn=true;laser.classList.add('on');
    }
  });
  document.addEventListener('keyup',e=>{
    if(e.key==='l'||e.key==='L'){state.laserOn=false;laser.classList.remove('on');}
  });
  document.addEventListener('mousemove',e=>{
    if(state.laserOn){laser.style.left=e.clientX+'px';laser.style.top=e.clientY+'px';}
  });
}

// ═══════════════════════════════════════════════════════════════
// 新增：绘图/批注模式
// ═══════════════════════════════════════════════════════════════
function setupDrawing(){
  const canvas=document.getElementById('ppt-draw-canvas');
  const ctx=canvas.getContext('2d');
  let drawing=false,lastX=0,lastY=0;
  function resizeCanvas(){
    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    if(state.drawHistory.length){
      state.drawHistory.forEach(stroke=>{
        ctx.beginPath();ctx.strokeStyle=stroke.c;ctx.lineWidth=stroke.w;ctx.lineCap='round';
        stroke.p.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
        ctx.stroke();
      });
    }
  }
  resizeCanvas();window.addEventListener('resize',resizeCanvas);
  canvas.addEventListener('mousedown',e=>{
    if(!state.drawOn)return;
    drawing=true;lastX=e.clientX;lastY=e.clientY;
    state.drawHistory.push({c:state.drawColor,w:state.drawLineWidth,p:[{x:lastX,y:lastY}]});
  });
  canvas.addEventListener('mousemove',e=>{
    if(!drawing||!state.drawOn)return;
    ctx.beginPath();ctx.strokeStyle=state.drawColor;ctx.lineWidth=state.drawLineWidth;ctx.lineCap='round';
    ctx.moveTo(lastX,lastY);ctx.lineTo(e.clientX,e.clientY);ctx.stroke();
    lastX=e.clientX;lastY=e.clientY;
    const stroke=state.drawHistory[state.drawHistory.length-1];
    stroke.p.push({x:lastX,y:lastY});
  });
  canvas.addEventListener('mouseup',()=>drawing=false);
  canvas.addEventListener('mouseout',()=>drawing=false);
  document.querySelectorAll('#ppt-draw-tools .dc-dot').forEach(d=>{
    d.onclick=()=>{document.querySelectorAll('#ppt-draw-tools .dc-dot').forEach(x=>x.classList.remove('on'));d.classList.add('on');state.drawColor=d.dataset.c;};
  });
  document.querySelectorAll('#ppt-draw-tools [data-lw]').forEach(b=>{
    b.onclick=()=>{document.querySelectorAll('#ppt-draw-tools [data-lw]').forEach(x=>x.classList.remove('on'));b.classList.add('on');state.drawLineWidth=+b.dataset.lw;};
  });
  document.getElementById('dt-clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);state.drawHistory=[];};
  document.getElementById('dt-close').onclick=()=>toggleDrawing();
}
function toggleDrawing(){
  state.drawOn=!state.drawOn;
  document.getElementById('ppt-draw-canvas').classList.toggle('on',state.drawOn);
  document.getElementById('ppt-draw-tools').classList.toggle('on',state.drawOn);
  const btn=document.getElementById('pt-draw');
  if(btn)btn.classList.toggle('on',state.drawOn);
  if(state.drawOn)toast('绘图模式: 按住鼠标涂鸦，按 D 或关闭按钮退出',2500);
}

// ═══════════════════════════════════════════════════════════════
// 新增：缩略图导航 (G 键)
// ═══════════════════════════════════════════════════════════════
function toggleThumbGrid(){
  const grid=document.getElementById('ppt-thumb-grid');
  state.thumbGridOn=!state.thumbGridOn;
  grid.classList.toggle('on',state.thumbGridOn);
  if(!state.thumbGridOn)return;
  grid.innerHTML='';
  const slides=document.querySelectorAll('#deck > section.slide');
  const cur=window.__currentSlideIndex||0;
  slides.forEach((s,i)=>{
    const item=document.createElement('div');item.className='tg-item'+(i===cur?' on':'');
    const clone=s.cloneNode(true);
    clone.className='tg-clone';
    clone.style.cssText='width:1600px;height:900px;transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none';
    clone.querySelectorAll('.ppt-frag').forEach(f=>f.classList.add('ppt-frag-on'));
    item.appendChild(clone);
    const num=document.createElement('div');num.className='tg-num';num.textContent=i+1;item.appendChild(num);
    const time=document.createElement('div');time.className='tg-time';
    time.textContent=state.slideTimes[i]?fmtTime(state.slideTimes[i]*1000):'--:--';
    item.appendChild(time);
    item.onclick=()=>{if(typeof window.go==='function')window.go(i);toggleThumbGrid();};
    grid.appendChild(item);
  });
  requestAnimationFrame(()=>{
    grid.querySelectorAll('.tg-item').forEach(it=>{
      const clone=it.querySelector('.tg-clone');
      if(clone){const w=it.clientWidth;clone.style.transform='scale('+(w/1600)+')';}
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// 新增：跳转 (Ctrl+G / J)
// ═══════════════════════════════════════════════════════════════
function showGoto(){
  const g=document.getElementById('ppt-goto');
  g.classList.add('on');
  const inp=document.getElementById('gt-in');inp.value='';inp.focus();
  const onKey=e=>{
    if(e.key==='Enter'){
      const n=+inp.value;if(n>=1){const slides=document.querySelectorAll('#deck > section.slide');if(n<=slides.length&&typeof window.go==='function')window.go(n-1);}
      g.classList.remove('on');document.removeEventListener('keydown',onKey);
    }else if(e.key==='Escape'){g.classList.remove('on');document.removeEventListener('keydown',onKey);}
  };
  setTimeout(()=>document.addEventListener('keydown',onKey),0);
}

// ═══════════════════════════════════════════════════════════════
// 新增：排练计时
// ═══════════════════════════════════════════════════════════════
function toggleRehearse(){
  state.rehearseOn=!state.rehearseOn;
  document.getElementById('ppt-rehearse').classList.toggle('on',state.rehearseOn);
  const btn=document.getElementById('pt-rehearse');
  if(btn)btn.textContent=state.rehearseOn?'⏹ 结束':'⏱ 排练';
  if(state.rehearseOn){
    state.slideTimes=[];state.slideStartTime=Date.now();toast('排练计时开始',2000);
  }else{
    const{idx}=getCurrentSlide();
    if(state.slideStartTime!=null){state.slideTimes[idx]=(state.slideTimes[idx]||0)+(Date.now()-state.slideStartTime)/1000;}
    const total=state.slideTimes.reduce((a,b)=>a+b,0);
    toast('排练结束 · 总用时 '+fmtTime(total*1000)+' · 按 G 查看详情',4000);
  }
}
function updateRehearse(){
  if(!state.rehearseOn)return;
  const now=Date.now();
  const{idx}=getCurrentSlide();
  const cur=state.slideTimes[idx]||0;
  const elapsed=(now-(state.slideStartTime||now))/1000;
  const total=cur+elapsed;
  document.getElementById('rh-time').textContent=fmtTime(total*1000);
  document.getElementById('rh-slide').textContent='第 '+(idx+1)+' 页';
}
function onSlideChangeRehearse(){
  if(!state.rehearseOn)return;
  const now=Date.now();
  const prev=window.__prevSlideIndex||0;
  if(state.slideStartTime!=null){state.slideTimes[prev]=(state.slideTimes[prev]||0)+(now-state.slideStartTime)/1000;}
  state.slideStartTime=now;
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
    window.__prevSlideIndex=window.__currentSlideIndex||0;
    onSlideChangeRehearse();
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
      if(state.thumbGridOn){e.preventDefault();return;}
      if(state.fragEnabled&&advanceFragment()){e.preventDefault();return;}
      e.preventDefault();
      const cur=window.__currentSlideIndex||0;
      if(typeof window.go==='function')window.go(cur+1);
    }
    // ← / PageUp: 优先回退 fragment, 否则翻页
    if(e.key==='ArrowLeft'||e.key==='PageUp'||e.key==='ArrowUp'){
      if(state.thumbGridOn){e.preventDefault();return;}
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
    if(e.key==='d'||e.key==='D'){e.preventDefault();toggleDrawing();}
    if(e.key==='g'||e.key==='G'){e.preventDefault();toggleThumbGrid();}
    if(e.key==='j'||e.key==='J'){e.preventDefault();showGoto();}
    if(e.key==='r'||e.key==='R'){e.preventDefault();toggleRehearse();}
    if(e.key==='Escape'){
      if(state.thumbGridOn){toggleThumbGrid();return;}
      if(state.bigTimerOn){toggleBigTimer();return;}
      if(state.notesOn){toggleNotes();return;}
      if(state.drawOn){toggleDrawing();return;}
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
  setupLaser();
  setupDrawing();
  updatePageCount();
  scanFragments();
  setInterval(updateRehearse,500);

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
  document.getElementById('pt-draw').onclick=toggleDrawing;
  document.getElementById('pt-rehearse').onclick=toggleRehearse;

  // 欢迎提示
  setTimeout(()=>toast('演示就绪 · N备注 · T计时 · D绘图 · G缩略图 · J跳转 · R排练 · →翻页/逐条 · P导出PDF',4500),800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
