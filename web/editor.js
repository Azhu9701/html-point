/* ============================================================
   HTML Point v3 · Keynote 风格编辑器
   新增：Command 撤销系统 · 动画系统 · 幻灯片切换 · 拖拽排序
   ============================================================ */
(function(){
'use strict';
if(window.__PPT_EDITOR_LOADED__) return;
window.__PPT_EDITOR_LOADED__ = true;

// ═══════════════════════════════════════════════════════════════
// 0. Command 模式撤销系统 (取代简单的 UndoManager)
// ═══════════════════════════════════════════════════════════════
class CommandManager {
  constructor(max=200){this._stack=[];this._idx=-1;this._max=max;}
  execute(cmd){
    cmd.execute();
    this._stack=this._stack.slice(0,this._idx+1);
    this._stack.push(cmd);
    if(this._stack.length>this._max)this._stack.shift();
    this._idx=this._stack.length-1;
  }
  undo(){
    if(this._idx<0)return false;
    this._stack[this._idx].undo();
    this._idx--;
    return true;
  }
  redo(){
    if(this._idx>=this._stack.length-1)return false;
    this._idx++;
    this._stack[this._idx].execute();
    return true;
  }
  clear(){this._stack=[];this._idx=-1;}
}


class SlideAddCommand {
  constructor(slideHTML, slideIndex, deck) { this.html = slideHTML; this.idx = slideIndex; this.deck = deck; this.el = null; }
  execute() {
    const t = document.createElement('div'); t.innerHTML = this.html; this.el = t.firstElementChild;
    const ss = this.deck.querySelectorAll(':scope > section.slide');
    if (this.idx >= ss.length) this.deck.appendChild(this.el); else this.deck.insertBefore(this.el, ss[this.idx]);
  }
  undo() { if (this.el) this.el.remove(); }
}
class ElementAddCommand {
  constructor(el, container) { this.el = el; this.container = container; this.done = false; }
  execute() { this.container.appendChild(this.el); this.done = true; }
  undo() { if (this.done) this.el.remove(); }
}
class ElementRemoveCommand {
  constructor(el) { this.el = el; this.parent = el.parentElement; this.next = el.nextElementSibling; }
  execute() { this.el.remove(); }
  undo() { if (this.next) this.parent.insertBefore(this.el, this.next); else this.parent.appendChild(this.el); }
}
class SlideStyleCommand {
  constructor(el, prop, oldVal, newVal) { this.el = el; this.prop = prop; this.oldVal = oldVal; this.newVal = newVal; }
  execute() { this.el.style[this.prop] = this.newVal; }
  undo() { this.el.style[this.prop] = this.oldVal; }
}
class SlideAttrCommand {
  constructor(el, attr, oldVal, newVal) { this.el = el; this.attr = attr; this.oldVal = oldVal; this.newVal = newVal; }
  execute() { if (this.newVal == null) this.el.removeAttribute(this.attr); else this.el.setAttribute(this.attr, this.newVal); }
  undo() { if (this.oldVal == null) this.el.removeAttribute(this.attr); else this.el.setAttribute(this.attr, this.oldVal); }
}
class SlideOrderCommand {
  constructor(deck, fromIdx, toIdx) { this.deck = deck; this.from = fromIdx; this.to = toIdx; }
  execute() {
    const ss = [...this.deck.querySelectorAll(':scope > section.slide')];
    if (this.to < this.from) this.deck.insertBefore(ss[this.from], ss[this.to]);
    else this.deck.insertBefore(ss[this.from], ss[this.to + 1]);
  }
  undo() {
    const ss = [...this.deck.querySelectorAll(':scope > section.slide')];
    if (this.from < this.to) this.deck.insertBefore(ss[this.to], ss[this.from]);
    else this.deck.insertBefore(ss[this.to], ss[this.from + 1]);
  }
}
// 具体命令类
class StyleCommand {
  constructor(el,prop,oldVal,newVal){this.el=el;this.prop=prop;this.oldVal=oldVal;this.newVal=newVal;}
  execute(){this.el.style[this.prop]=this.newVal;}
  undo(){this.el.style[this.prop]=this.oldVal;}
}
class MoveCommand {
  constructor(el,oldLeft,oldTop,newLeft,newTop){this.el=el;this.ol=oldLeft;this.ot=oldTop;this.nl=newLeft;this.nt=newTop;}
  execute(){this.el.style.left=this.nl+'px';this.el.style.top=this.nt+'px';}
  undo(){this.el.style.left=this.ol+'px';this.el.style.top=this.ot+'px';}
}
class ResizeCommand {
  constructor(el,oldW,oldH,oldL,oldT,newW,newH,newL,newT){this.el=el;this.ow=oldW;this.oh=oldH;this.ol=oldL;this.ot=oldT;this.nw=newW;this.nh=newH;this.nl=newL;this.nt=newT;}
  execute(){this.el.style.width=this.nw+'px';this.el.style.height=this.nh+'px';this.el.style.left=this.nl+'px';this.el.style.top=this.nt+'px';}
  undo(){this.el.style.width=this.ow+'px';this.el.style.height=this.oh+'px';this.el.style.left=this.ol+'px';this.el.style.top=this.ot+'px';}
}
class TextContentCommand {
  constructor(el,oldHTML,newHTML){this.el=el;this.oldHTML=oldHTML;this.newHTML=newHTML;}
  execute(){this.el.innerHTML=this.newHTML;}
  undo(){this.el.innerHTML=this.oldHTML;}
}
class SlideDeleteCommand {
  constructor(slideHTML,slideIndex,deck){this.html=slideHTML;this.idx=slideIndex;this.deck=deck;this.ref=null;}
  execute(){
    const ss=this.deck.querySelectorAll(':scope > section.slide');
    if(this.idx<ss.length){this.ref=ss[this.idx];this.ref.remove();}
  }
  undo(){
    const t=document.createElement('div');t.innerHTML=this.html;const s=t.firstElementChild;
    const ss=this.deck.querySelectorAll(':scope > section.slide');
    if(this.idx>=ss.length)this.deck.appendChild(s);else this.deck.insertBefore(s,ss[this.idx]);
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. 工具函数
// ═══════════════════════════════════════════════════════════════
function rgbHex(c){
  if(!c||c==='transparent')return'#333333';
  if(c.startsWith('#'))return c.length===4?'#'+c.slice(1).split('').map(x=>x+x).join(''):c.slice(0,7);
  const m=c.match(/\d+/g);if(!m)return'#fff';
  return'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');
}
function toast(m,t=2000){
  const e=document.getElementById('ppt-toast');
  if(!e)return;e.textContent=m;e.classList.add('show');
  clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),t);
}
function showGuides(el){
  const g=document.getElementById('ppt-guides');if(!g)return;
  g.classList.add('show');g.innerHTML='';
  const s=el.closest('section.slide');if(!s)return;
  const sr=s.getBoundingClientRect(),er=el.getBoundingClientRect();
  // 垂直中线
  if(Math.abs(er.left+er.width/2-sr.left-sr.width/2)<6){
    const v=document.createElement('div');v.className='ppt-guide v';
    v.style.left=(sr.left+sr.width/2)+'px';g.appendChild(v);
    el.style.left=(sr.width/2-er.width/2)+'px';
  }
  // 水平中线
  if(Math.abs(er.top+er.height/2-sr.top-sr.height/2)<6){
    const h=document.createElement('div');h.className='ppt-guide h';
    h.style.top=(sr.top+sr.height/2)+'px';g.appendChild(h);
    el.style.top=(sr.height/2-er.height/2)+'px';
  }
  // 8px 网格吸附 (snap-to-grid)
  const grid=8;
  const snapL=Math.round(er.left/grid)*grid;
  if(Math.abs(er.left-snapL)<5){
    const v2=document.createElement('div');v2.className='ppt-guide v';
    v2.style.left=snapL+'px';v2.style.opacity='0.3';
    g.appendChild(v2);
    el.style.left=(parseFloat(el.style.left)||0)+(snapL-er.left)+'px';
  }
}
function hideGuides(){
  const g=document.getElementById('ppt-guides');
  if(g){g.classList.remove('show');g.innerHTML='';}
}

// ═══════════════════════════════════════════════════════════════
// 2. CSS 样式 (UI + 动画)
// ═══════════════════════════════════════════════════════════════
const CSS=`
/* ── CSS 变量 ── */
:root{--hp-sb:170px;--hp-in:260px}
@media(max-width:1400px){:root{--hp-sb:140px;--hp-in:200px}}
@media(max-width:1100px){:root{--hp-sb:110px;--hp-in:160px}}

/* ── 工具栏 ── */
#ppt-bar{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;align-items:center;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:10px;padding:6px 10px;font-family:-apple-system,"PingFang SC",sans-serif;font-size:13px;max-width:96vw;flex-wrap:wrap;justify-content:center}
#ppt-bar button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 11px;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap}
#ppt-bar button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-bar button.pri{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35;font-weight:600}
#ppt-bar button.icon{padding:6px 8px;font-size:14px}
#ppt-bar button.danger:hover{background:#ff3b30;color:#fff}
#ppt-bar .sp{width:1px;height:20px;background:#3a3a3c;margin:0 3px}
#ppt-bar .st{font-size:11px;color:#888;margin-left:2px;min-width:50px}
#ppt-bar select{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:5px 8px;font-size:11px;cursor:pointer;font-family:inherit;max-width:100px}

/* ── 左侧导航栏 ── */
#ppt-sb{position:fixed;left:0;top:0;bottom:0;width:var(--hp-sb);background:#141416;border-right:1px solid #2c2c2e;z-index:9998;overflow-y:auto;padding:52px 8px 12px;display:none}
#ppt-sb.on{display:block}
.sb-t{position:relative;width:100%;aspect-ratio:16/9;background:#0a0a0a;border:2px solid transparent;border-radius:6px;margin-bottom:8px;cursor:pointer;overflow:hidden}
.sb-t:hover{border-color:#5a5a5a}.sb-t.on{border-color:#ff6b35}
.sb-t .sb-clone{position:absolute;top:0;left:0;width:1600px;transform-origin:top left;pointer-events:none}
.sb-t .sb-num{position:absolute;top:3px;left:5px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px}
.sb-t.drag-over{border-color:#00d4ff!important;border-style:dashed}

/* ── 右侧检查器 ── */
#ppt-in{position:fixed;right:0;top:0;bottom:0;width:var(--hp-in);background:#1c1c1e;border-left:1px solid #3a3a3c;z-index:9998;overflow-y:auto;padding:52px 12px 12px;display:none;font-family:-apple-system,"PingFang SC",sans-serif}
#ppt-in.on{display:block}
#ppt-in .ie{color:#666;font-size:12px;text-align:center;margin-top:40px}
.is{border-bottom:1px solid #2c2c2e;padding:10px 0}.is:last-child{border-bottom:0}
.is .ih{color:#ff6b35;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.ir{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:12px;color:#bbb}
.ir label{flex-shrink:0}
.ir input[type=number],.ir input[type=text],.ir select{background:#1c1c1e;color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:4px 6px;font-size:12px;width:70px;font-family:inherit}
.ir input[type=range]{flex:1;margin-left:8px}
.ir input[type=color]{width:32px;height:26px;border:1px solid #3a3a3c;border-radius:5px;background:#1c1c1e;cursor:pointer;padding:2px}
.ib{display:flex;gap:4px;flex-wrap:wrap}
.ib button{background:#2c2c2e;color:#ccc;border:1px solid #3a3a3c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:inherit}
.ib button.on,.ib button:hover{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35}
.ps{box-shadow:0 0 0 2px #00d4ff!important}

/* ── 可编辑元素 ── */
body.pe [contenteditable]{cursor:text;outline:none!important}
body.pe [contenteditable]:hover{box-shadow:0 0 0 1px rgba(255,107,53,.5)}
body.pe [contenteditable]:focus{box-shadow:0 0 0 2px #ff6b35!important;background:rgba(255,107,53,.04)}
body.pe .pw{cursor:move;position:relative;user-select:none;-webkit-user-select:none}
body.pe .pw img{-webkit-user-drag:none;user-select:none;pointer-events:none}
body.pe .pw:hover{box-shadow:0 0 0 2px #ff6b35}
body.pe .pw.ps{box-shadow:0 0 0 2px #00d4ff!important}
.dh{position:absolute;display:none;z-index:40;pointer-events:auto}
body.pe .pw.ps .dh{display:flex}
.dh.rs{width:14px;height:14px;background:#00d4ff;border:2px solid #fff;border-radius:3px;position:absolute;z-index:41}
.dh.rs.tl{top:-7px;left:-7px;cursor:nwse-resize}.dh.rs.tr{top:-7px;right:-7px;cursor:nesw-resize}
.dh.rs.bl{bottom:-7px;left:-7px;cursor:nesw-resize}.dh.rs.br{bottom:-7px;right:-7px;cursor:nwse-resize}

/* ── 对齐参考线 ── */
#ppt-gd{position:fixed;inset:0;pointer-events:none;z-index:9997;display:none}
#ppt-gd.on{display:block}.gd{position:absolute;background:#ff3b30;opacity:.8}
.gd.h{height:1px;left:0;right:0}.gd.v{width:1px;top:0;bottom:0}

/* ── 页面控制按钮 ── */
body.pe .pc{display:flex!important}.pc{display:none;gap:4px;position:absolute;top:8px;right:8px;z-index:50}
.pc button{background:rgba(28,28,30,.95);color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:-apple-system,sans-serif}
.pc button:hover{background:#ff6b35;color:#0a0a0a}.pc button.del:hover{background:#ff3b30;color:#fff}

/* ── 编辑模式布局 ── */
body.pe #deck{transition:none!important}
body.pe .slide{padding-left:0!important;padding-right:0!important}
body.pe .canvas-card{margin-left:var(--hp-sb)!important;width:calc(100vw - var(--hp-sb) - var(--hp-in))!important}

/* ── 缩放控制 ── */
#ppt-zm{position:fixed;left:calc(var(--hp-sb) + 20px);bottom:14px;z-index:9999;display:none;align-items:center;gap:4px;background:rgba(28,28,30,.98);border:1px solid #3a3a3c;border-radius:8px;padding:5px 8px;font-family:-apple-system,sans-serif}
body.pe #ppt-zm{display:flex}
#ppt-zm button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:3px;font-size:14px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center}
#ppt-zm button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-zm .zv{color:#fff;font-size:12px;min-width:42px;text-align:center}

/* ── Toast ── */
#ppt-to{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:10001;background:rgba(28,28,30,.98);color:#fff;border:1px solid #ff6b35;border-radius:8px;padding:10px 18px;font-size:13px;font-family:-apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .2s}
#ppt-to.on{opacity:1}

/* ═══════════════════════════════════════════════════
   动画系统: 元素入场动画 (10 个预设)
   ═══════════════════════════════════════════════════ */
@keyframes ppt-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes ppt-fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes ppt-fadeInDown{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}
@keyframes ppt-fadeInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
@keyframes ppt-fadeInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes ppt-zoomIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
@keyframes ppt-slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
@keyframes ppt-slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes ppt-typewriter{from{width:0}to{width:100%}}
@keyframes ppt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes ppt-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
@keyframes ppt-flipX{from{transform:perspective(400px) rotateY(90deg);opacity:0}to{transform:perspective(400px) rotateY(0);opacity:1}}

/* 动画应用类 (演示时由 JS 动态添加) */
.ppt-anim{animation-duration:.6s;animation-fill-mode:both;animation-timing-function:cubic-bezier(.25,.46,.45,.94)}
.ppt-anim-fadeIn{animation-name:ppt-fadeIn}
.ppt-anim-fadeInUp{animation-name:ppt-fadeInUp}
.ppt-anim-fadeInDown{animation-name:ppt-fadeInDown}
.ppt-anim-fadeInLeft{animation-name:ppt-fadeInLeft}
.ppt-anim-fadeInRight{animation-name:ppt-fadeInRight}
.ppt-anim-zoomIn{animation-name:ppt-zoomIn}
.ppt-anim-slideInLeft{animation-name:ppt-slideInLeft}
.ppt-anim-slideInRight{animation-name:ppt-slideInRight}
.ppt-anim-pulse{animation-name:ppt-pulse;animation-duration:1s}
.ppt-anim-shake{animation-name:ppt-shake;animation-duration:.8s}
.ppt-anim-flipX{animation-name:ppt-flipX}

/* ═══════════════════════════════════════════════════
   幻灯片切换效果
   ═══════════════════════════════════════════════════ */
.slide.trans-fade{transition:opacity .5s ease}
.slide.trans-slide{transition:transform .6s cubic-bezier(.77,0,.175,1)}
.slide.trans-zoom{transition:transform .5s ease,opacity .5s ease}

/* 进入/离开状态由 JS 动态控制 */
.slide.trans-out-fade{opacity:0}
.slide.trans-out-slide{transform:translateX(-30px);opacity:0}
.slide.trans-out-zoom{transform:scale(.9);opacity:0}
.slide.trans-in-fade{opacity:1}
.slide.trans-in-slide{transform:translateX(0);opacity:1}
.slide.trans-in-zoom{transform:scale(1);opacity:1}

/* ── 演讲者备注编辑面板 ── */
#ppt-notes-panel{position:fixed;left:var(--hp-sb);bottom:14px;z-index:9999;display:none;flex-direction:column;width:380px;max-width:calc(100vw - var(--hp-sb) - var(--hp-in) - 40px);background:#1c1c1e;border:1px solid #3a3a3c;border-radius:10px;padding:10px 14px;font-family:-apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.5)}
#ppt-notes-panel.on{display:flex}
#ppt-notes-panel .nph{color:#ff6b35;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
#ppt-notes-panel .nph span{color:#888;font-weight:400;text-transform:none;letter-spacing:0;font-size:11px}
#ppt-notes-panel textarea{background:#0a0a0a;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:8px 10px;font-size:13px;font-family:inherit;line-height:1.5;resize:vertical;min-height:80px;max-height:200px;width:100%}
#ppt-notes-panel textarea:focus{outline:none;border-color:#ff6b35}
/* 新增：插入菜单 */
#ppt-insert-menu{position:absolute;top:44px;left:50%;transform:translateX(-50%);z-index:10000;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:10px;padding:8px 0;display:none;flex-direction:column;min-width:180px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
#ppt-insert-menu.on{display:flex}
#ppt-insert-menu button{background:transparent;color:#fff;border:none;border-radius:0;padding:8px 16px;font-size:12px;cursor:pointer;text-align:left;font-family:inherit;white-space:nowrap}
#ppt-insert-menu button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-insert-menu .sep{height:1px;background:#3a3a3c;margin:4px 0}
/* 新增：对话框 */
#ppt-dialog{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10001;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:12px;padding:20px;min-width:320px;max-width:90vw;max-height:90vh;overflow-y:auto;display:none;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,"PingFang SC",sans-serif}
#ppt-dialog.on{display:block}
#ppt-dialog h3{margin:0 0 12px 0;color:#ff6b35;font-size:14px;font-weight:700}
#ppt-dialog label{display:block;color:#bbb;font-size:12px;margin:10px 0 4px}
#ppt-dialog input,#ppt-dialog select,#ppt-dialog textarea{background:#0a0a0a;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 8px;font-size:12px;width:100%;font-family:inherit;box-sizing:border-box}
#ppt-dialog textarea{resize:vertical;min-height:80px}
#ppt-dialog .dia-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
#ppt-dialog .dia-btns button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:inherit}
#ppt-dialog .dia-btns button.pri{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35;font-weight:600}
#ppt-dialog .dia-btns button:hover{filter:brightness(1.2)}
#ppt-dialog-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:none}
#ppt-dialog-overlay.on{display:block}
/* 新增：查找替换 */
#ppt-find{position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:10002;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:10px;padding:12px 16px;display:none;gap:8px;align-items:center;font-family:-apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.5)}
#ppt-find.on{display:flex}
#ppt-find input{background:#0a0a0a;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 8px;font-size:12px;width:160px;font-family:inherit}
#ppt-find button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit}
#ppt-find button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-find .fr-stat{color:#888;font-size:11px;white-space:nowrap}
/* 新增：全局字体面板 */
#ppt-font-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10001;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:12px;padding:20px;width:360px;display:none;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,"PingFang SC",sans-serif}
#ppt-font-panel.on{display:block}
#ppt-font-panel h3{margin:0 0 12px 0;color:#ff6b35;font-size:14px;font-weight:700}
#ppt-font-panel label{display:block;color:#bbb;font-size:12px;margin:8px 0 3px}
#ppt-font-panel select,#ppt-font-panel input[type=number]{background:#0a0a0a;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 8px;font-size:12px;width:100%;font-family:inherit;box-sizing:border-box}
#ppt-font-panel .fp-row{display:flex;gap:8px;align-items:center;margin-top:12px}
#ppt-font-panel .fp-row button{flex:1;background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit}
#ppt-font-panel .fp-row button.pri{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35;font-weight:600}
#ppt-font-panel .fp-row button:hover{filter:brightness(1.2)}
/* 新增：形状、代码块、表格、引用等基础样式 */
.ppt-table{width:100%;border-collapse:collapse;font-size:14px}
.ppt-table th,.ppt-table td{border:1px solid #3a3a3c;padding:8px 12px;text-align:left}
.ppt-table th{background:#2c2c2e;color:#ff6b35;font-weight:600}
.ppt-table td{background:#1c1c1e;color:#fff}
.ppt-code-block{background:#0a0a0a;border:1px solid #3a3a3c;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;line-height:1.5;color:#e0e0e0;overflow-x:auto;white-space:pre}
.ppt-blockquote{border-left:4px solid #ff6b35;padding:8px 16px;margin:8px 0;background:#1c1c1e;color:#ccc;font-style:italic;border-radius:0 6px 6px 0}
.ppt-shape-rect{background:#ff6b35;border-radius:4px}
.ppt-shape-circle{background:#ff6b35;border-radius:50%}
.ppt-shape-arrow{position:relative;width:0;height:0;border-style:solid}
/* 新增：幻灯片母版面板 */
#ppt-master-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10001;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:12px;padding:20px;width:400px;max-height:80vh;overflow-y:auto;display:none;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,"PingFang SC",sans-serif}
#ppt-master-panel.on{display:block}
#ppt-master-panel h3{margin:0 0 12px 0;color:#ff6b35;font-size:14px;font-weight:700}
#ppt-master-panel label{display:block;color:#bbb;font-size:12px;margin:8px 0 3px}
#ppt-master-panel input,#ppt-master-panel select{background:#0a0a0a;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 8px;font-size:12px;width:100%;font-family:inherit;box-sizing:border-box}
#ppt-master-panel .mp-row{display:flex;gap:8px;align-items:center;margin-top:12px}
#ppt-master-panel .mp-row button{flex:1;background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit}
#ppt-master-panel .mp-row button.pri{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35;font-weight:600}
#ppt-master-panel .mp-row button:hover{filter:brightness(1.2)}
`;

// 注入 CSS
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:CSS}));

// ═══════════════════════════════════════════════════════════════
// 2.5. 公共模块 (导航+动画 fallback 由 core.js 提供)
// ═══════════════════════════════════════════════════════════════
// setupBuiltinNav + setupBuiltinAnim 已提取到 web/core.js,
// start() 调用 __pptCore.setup() — 若演示稿自带 go()/playSlide 则自动让位。
// 编辑器补充: 编辑模式键盘导航 (非 contenteditable 聚焦时)
function setupEditorNav(){
  const deck=document.getElementById('deck');
  if(!deck)return;
  const slides=deck.querySelectorAll(':scope > section.slide');
  const total=slides.length;if(!total)return;
  document.addEventListener('keydown',e=>{
    if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    const cur=window.__currentSlideIndex||0;
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();if(window.go)window.go(cur+1);}
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();if(window.go)window.go(cur-1);}
    else if(e.key==='Home'){e.preventDefault();if(window.go)window.go(0);}
    else if(e.key==='End'){e.preventDefault();if(window.go)window.go(total-1);}
  });
}

// ═══════════════════════════════════════════════════════════════
// 3. PPTEditor 主类
// ═══════════════════════════════════════════════════════════════
class PPTEditor{
  constructor(){
    this.m='view';        // 模式: view | edit
    this.z=1;             // 缩放
    this.d=0;             // 脏标记
    this.cmd=new CommandManager();  // 撤销系统
    this.dispose=[];
    this.sel=null;
    this.fn='';
    this._goWrapped=0;
    this.transition='fade'; // 默认切换效果
    this._findIdx=-1;
    this._findEls=[];
    this._master={fontFamily:'',fontSize:'',color:'',bgColor:'',lineHeight:''};
  }

  start(){if(window.__pptCore)window.__pptCore.setup();setupEditorNav();this._ui();this._bind();this._fn();this._injectTransitions();return this;}
  stop(){
    this._toggle(0);
    document.querySelectorAll('.pc,.dh').forEach(c=>c.remove());
    document.querySelectorAll('.ps,.pw').forEach(c=>c.classList.remove('ps','pw'));
    this.cmd.clear();
    this.dispose.forEach(f=>f());
    this.dispose=[];
  }

  // ── UI 构建 ──
  _ui(){
    // 如果已有工具栏 (保存时残留的), 清除 display:none 复用之
    const existing=document.getElementById('ppt-bar');
    if(existing){
      existing.style.display='';  // 清除残留的 display:none
      // 同时清除其他残留编辑器 UI 的隐藏样式
      ['ppt-sb','ppt-in','ppt-gd','ppt-zm','ppt-to','ppt-notes-panel'].forEach(id=>{
        const e=document.getElementById(id);if(e)e.style.display='';
      });
      return;
    }
    // 工具栏
    const bar=document.createElement('div');bar.id='ppt-bar';
    bar.innerHTML='<span style="color:#ff6b35;font-weight:700;font-size:11px">▶</span>'+
      '<button id="eb-t" class="pri">编辑</button>'+
      '<span class="sp"></span>'+
      '<button id="eb-add" class="icon" title="新增页">＋</button>'+
      '<button id="eb-dup" class="icon" title="复制页">⧉</button>'+
      '<button id="eb-del" class="icon danger" title="删除页">🗑</button>'+
      '<span class="sp"></span>'+
      '<button id="eb-ins" title="插入 ▼">插入</button>'+
      '<button id="eb-font" title="全局字体">🅰 字体</button>'+
      '<button id="eb-master" title="幻灯片母版">⚙ 母版</button>'+
      '<span class="sp"></span>'+
      '<button id="eb-notes" class="icon" title="演讲者备注">📝</button>'+
      '<select id="eb-trans" title="切换效果"><option value="fade">淡入</option><option value="slide">滑动</option><option value="zoom">缩放</option><option value="none">无</option></select>'+
      '<span class="sp"></span>'+
      '<button id="eb-pdf" class="icon" title="导出 PDF">📄</button>'+
      '<button id="eb-s" class="pri">💾 保存</button>'+
      '<button id="eb-present" class="pri" title="演示模式 (新标签页全屏播放)">▶ 演示</button>'+
      '<span class="st" id="eb-st">已加载</span>'+
      '<span id="eb-fn" style="color:#888;font-size:11px;border-left:1px solid #333;padding-left:8px;margin-left:4px"></span>'+
      '<button id="eb-h">？</button>';
    document.body.appendChild(bar);

    // 插入菜单
    const im=document.createElement('div');im.id='ppt-insert-menu';
    im.innerHTML='<button data-ins="table">📊 表格</button>'+
      '<button data-ins="code">💻 代码块</button>'+
      '<button data-ins="shape">🔷 形状</button>'+
      '<div class="sep"></div>'+
      '<button data-ins="video">🎬 视频 / iframe</button>'+
      '<button data-ins="quote">❝ 引用块</button>'+
      '<div class="sep"></div>'+
      '<button data-ins="image">🖼 图片</button>'+
      '<button data-ins="text">📝 文本框</button>';
    document.body.appendChild(im);

    // 查找替换面板
    const fr=document.createElement('div');fr.id='ppt-find';
    fr.innerHTML='<input id="fr-f" placeholder="查找" style="width:140px">'+
      '<input id="fr-r" placeholder="替换为" style="width:140px">'+
      '<button id="fr-nxt">下一个</button>'+
      '<button id="fr-rep">替换</button>'+
      '<button id="fr-all">全部替换</button>'+
      '<button id="fr-cls">✕</button>'+
      '<span class="fr-stat" id="fr-st">0/0</span>';
    document.body.appendChild(fr);

    // 对话框 (复用)
    const ov=document.createElement('div');ov.id='ppt-dialog-overlay';document.body.appendChild(ov);
    const dia=document.createElement('div');dia.id='ppt-dialog';document.body.appendChild(dia);

    // 全局字体面板
    const fp=document.createElement('div');fp.id='ppt-font-panel';
    fp.innerHTML='<h3>🅰 全局字体调整</h3>'+
      '<label>字体</label><select id="fp-f"><option value="">默认</option><option value="-apple-system,BlinkMacSystemFont,sans-serif">系统默认</option><option value="Georgia,serif">Georgia</option><option value="monospace">Monospace</option></select>'+
      '<label>基础字号</label><input type="number" id="fp-s" value="16" min="8" max="72">'+
      '<label>文字颜色</label><input type="color" id="fp-c" value="#ffffff">'+
      '<label>背景颜色</label><input type="color" id="fp-b" value="#000000">'+
      '<label>行高</label><input type="number" id="fp-l" value="1.5" min="1" max="3" step="0.1">'+
      '<div class="fp-row"><button id="fp-ap" class="pri">应用</button><button id="fp-cl">取消</button></div>';
    document.body.appendChild(fp);

    // 幻灯片母版面板
    const mp=document.createElement('div');mp.id='ppt-master-panel';
    mp.innerHTML='<h3>⚙ 幻灯片母版</h3>'+
      '<label>全局字体</label><select id="mp-f"><option value="">继承</option><option value="-apple-system,BlinkMacSystemFont,sans-serif">系统默认</option><option value="Georgia,serif">Georgia</option><option value="monospace">Monospace</option></select>'+
      '<label>全局字号</label><input type="number" id="mp-s" value="" placeholder="留空继承" min="8" max="72">'+
      '<label>全局文字颜色</label><input type="color" id="mp-c" value="#ffffff">'+
      '<label>默认背景色</label><input type="color" id="mp-b" value="#000000">'+
      '<label>默认行高</label><input type="number" id="mp-l" value="1.5" min="1" max="3" step="0.1">'+
      '<div class="mp-row"><button id="mp-ap" class="pri">应用母版</button><button id="mp-cl">取消</button></div>';
    document.body.appendChild(mp);

    // 侧栏、检查器、参考线、缩放条、备注面板、Toast
    [{id:'ppt-sb'},{id:'ppt-in',h:'<div class="ie">选中元素查看属性</div>'},{id:'ppt-gd'},
     {id:'ppt-zm',h:'<button id="zm-o">−</button><span class="zv" id="zm-v">100%</span><button id="zm-i">＋</button><button id="zm-f">⤢</button>'},
     {id:'ppt-notes-panel',h:'<div class="nph">📝 演讲者备注 <span id="np-slide">第 1 页</span></div><textarea id="np-text" placeholder="输入本页的演讲备注…&#10;演示模式下按 N 键查看"></textarea>'},
     {id:'ppt-to'}].forEach(d=>{
      const e=document.createElement('div');e.id=d.id;if(d.h)e.innerHTML=d.h;document.body.appendChild(e);
    });
    // 备注输入框联动
    const npText=document.getElementById('np-text');
    if(npText)npText.oninput=()=>{
      const{el}=this._curSlide();if(!el)return;
      const v=npText.value.trim();
      if(v)el.setAttribute('data-notes',v);else el.removeAttribute('data-notes');
      this._md();
    };
  }

  // ── 事件绑定 ──
  _bind(){
    document.getElementById('eb-t').onclick=()=>this._toggle();
    document.getElementById('eb-add').onclick=()=>this._add();
    document.getElementById('eb-dup').onclick=()=>this._dup();
    document.getElementById('eb-del').onclick=()=>this._del(window.__currentSlideIndex||0);
    document.getElementById('eb-s').onclick=()=>this._save();
    document.getElementById('eb-present').onclick=()=>this._present();
    document.getElementById('eb-notes').onclick=()=>this._toggleNotes();
    document.getElementById('eb-pdf').onclick=()=>this._exportPDF();
    document.getElementById('eb-h').onclick=()=>toast('＋新增 ⧉复制 🗑删除 📝备注 ▶演示 📄PDF · 左栏拖拽排序 · Cmd+S保存 · Cmd+Z撤销 · Ctrl+F查找',5000);

    // 插入菜单
    const insBtn=document.getElementById('eb-ins');
    const insMenu=document.getElementById('ppt-insert-menu');
    if(insBtn&&insMenu){
      insBtn.onclick=e=>{e.stopPropagation();insMenu.classList.toggle('on');};
      document.addEventListener('click',e=>{if(!insMenu.contains(e.target))insMenu.classList.remove('on');});
      insMenu.querySelectorAll('[data-ins]').forEach(b=>{
        b.onclick=()=>{this._insert(b.dataset.ins);insMenu.classList.remove('on');};
      });
    }
    // 字体面板
    document.getElementById('eb-font').onclick=()=>this._showFontPanel();
    // 母版面板
    document.getElementById('eb-master').onclick=()=>this._showMasterPanel();

    const transSel=document.getElementById('eb-trans');
    if(transSel)transSel.onchange=()=>{this.transition=transSel.value;this._applyTransition();};

    [['zm-o',-0.1],['zm-i',0.1],['zm-f',0]].forEach(([id,v])=>{
      const el=document.getElementById(id);if(el)el.onclick=()=>this._zoom(v?v:1);
    });

    // 查找替换
    document.getElementById('fr-cls').onclick=()=>this._hideFind();
    document.getElementById('fr-nxt').onclick=()=>this._findNext();
    document.getElementById('fr-rep').onclick=()=>this._findReplace();
    document.getElementById('fr-all').onclick=()=>this._findReplaceAll();

    const onKey=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();this._save();}
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)this.cmd.redo();else this.cmd.undo();}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();this.cmd.redo();}
      if((e.metaKey||e.ctrlKey)&&e.key==='f'){e.preventDefault();this._showFind();}
      if(e.key==='Escape'){this._hideFind();this._hideDialog();this._hideFontPanel();this._hideMasterPanel();this._clr();hideGuides();}
    };
    const onInput=e=>{if(e.target.getAttribute('contenteditable')==='true')this._md();};
    const onUnload=e=>{if(this.d){e.preventDefault();e.returnValue='未保存';}};

    document.addEventListener('keydown',onKey);
    document.addEventListener('input',onInput);
    window.addEventListener('beforeunload',onUnload);
    this.dispose.push(()=>{
      document.removeEventListener('keydown',onKey);
      document.removeEventListener('input',onInput);
      window.removeEventListener('beforeunload',onUnload);
    });
  }

  _fn(){
    const p=new URLSearchParams(location.search);
    this.fn=p.get('file')||'';
    if(!this.fn)this.fn=(document.title||'未命名')+'.html';
    const el=document.getElementById('eb-fn');if(el)el.textContent=this.fn;
  }

  _md(){this.d=1;const s=document.getElementById('eb-st');if(s){s.textContent='● 未保存';s.style.color='#ff6b35';}}

  // ── 切换过渡注入 ──
  _injectTransitions(){
    // 读取 deck 上的持久化过渡设置
    const deck=document.getElementById('deck');
    const saved=deck?deck.getAttribute('data-transition'):null;
    if(saved)this.transition=saved;
    // 更新下拉框
    const sel=document.getElementById('eb-trans');
    if(sel)sel.value=this.transition==='none'?'none':this.transition;
    this._applyTransition();
  }
  _applyTransition(){
    const t=this.transition;
    document.querySelectorAll('#deck > section.slide').forEach(s=>{
      s.classList.remove('trans-fade','trans-slide','trans-zoom');
      if(t!=='none')s.classList.add('trans-'+t);
    });
    // 持久化到 deck 属性
    const deck=document.getElementById('deck');
    if(deck)deck.setAttribute('data-transition',t);
  }

  // ── 编辑模式开关 ──
  _toggle(f){
    const on=typeof f==='boolean'?f:this.m!=='edit';
    this.m=on?'edit':'view';
    document.body.classList.toggle('pe',on);
    ['ppt-sb','ppt-in'].forEach(id=>document.getElementById(id).classList.toggle('on',on));
    const btn=document.getElementById('eb-t');
    btn.textContent=on?'✓ 编辑':'编辑';
    btn.classList.toggle('pri',!on);
    if(on){
      this._me();this._sb();
      // 编辑模式: 拦截演示稿原生键盘导航, 避免编辑文字时翻页
      this._blockNativeNav();
      toast('点文字编辑 · 点图拖拽缩放 · 右栏调属性 · 左栏拖拽排序',3500);
    }else{
      this._ue();hideGuides();this._clr();this._zoom(1);
      this._unblockNativeNav();
    }
  }

  // 编辑模式时, 在捕获阶段拦截方向键/空格/PageUp/Down,
  // 阻止演示稿自带的 go() 键盘导航在编辑文字时触发翻页
  _blockNativeNav(){
    if(this._navBlocker)return;
    this._navBlocker=e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'&&e.key!=='ArrowUp'&&e.key!=='ArrowDown'&&
         e.key!=='PageUp'&&e.key!=='PageDown'&&e.key!==' '&&e.key!=='Home'&&e.key!=='End')return;
      const t=e.target;
      if(t&&(t.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t.tagName))){
        e.stopImmediatePropagation();  // 阻止演示稿原生 go() 处理器
      }
    };
    document.addEventListener('keydown',this._navBlocker,true);
  }
  _unblockNativeNav(){
    if(this._navBlocker){document.removeEventListener('keydown',this._navBlocker,true);this._navBlocker=null;}
  }

  // ── 标记可编辑元素 ──
  _me(){
    const T=['H1','H2','H3','H4','H5','H6','P','SPAN','LI','STRONG','B','EM'];
    const D=['lead','t-meta','t-cat','col-ttl','col-desc','col-tag','layer-ttl','layer-nb','layer-desc','layer-tag','l','r','multi','nb','yr','desc','ttl','note','lbl','unit','stat-label','stat-note','step-nb','step-title','step-desc','bar-label','bar-value','row-lbl','row-val'];
    document.querySelectorAll('#deck > section.slide').forEach((s,i)=>{
      s.querySelectorAll('*').forEach(el=>{
        if(el.closest('#ppt-bar,#ppt-sb,#ppt-in,#nav')||el.classList.contains('dh')||el.classList.contains('pc'))return;
        const fc=(typeof el.className==='string'&&el.className.split(' ')[0])||'';
        if(T.includes(el.tagName)||(el.tagName==='DIV'&&D.includes(fc))){
          const ht=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
          if(ht||el.children.length===0)el.setAttribute('contenteditable','true');
        }
      });
      // 图片：加拖拽手柄
      s.querySelectorAll('img').forEach(img=>{
        const w=img.closest('.robot-shot,.scene-img,.thumb,.case-img,.hook-shot,.frame-img')||img.parentElement;
        if(!w.classList.contains('pw')){
          w.classList.add('pw');
          ['tl','tr','bl','br'].forEach(c=>{
            const h=document.createElement('div');h.className='dh rs '+c;h.dataset.c=c;w.appendChild(h);
          });
          this._drag(w);
          w.addEventListener('mousedown',e=>{
            if(this.m!=='edit'||e.target.classList.contains('dh'))return;
            this._ins(w);
          },true);
        }
      });
      // 页面控制按钮
      if(!s.querySelector('.pc')){
        const c=document.createElement('div');c.className='pc';
        c.innerHTML='<button title="上移">↑</button><button title="下移">↓</button><button class="del" title="删除">✕</button>';
        if(getComputedStyle(s).position==='static')s.style.position='relative';
        s.appendChild(c);
        c.children[0].onclick=e=>{this._mv(i,-1);e.stopPropagation();};
        c.children[1].onclick=e=>{this._mv(i,1);e.stopPropagation();};
        c.lastChild.onclick=e=>{this._del(i);e.stopPropagation();};
      }
      // 幻灯片空白区域点击 -> 幻灯片属性
      s.addEventListener('click',e=>{
        if(this.m!=='edit')return;
        if(e.target===s||e.target===s.querySelector('.slide-bg')||e.target.classList.contains('pc')||e.target.closest('.pc')){
          this._slideInspector(s);e.stopPropagation();
        }
      });
    });
  }

  _ue(){
    document.querySelectorAll('[contenteditable="true"]').forEach(e=>e.removeAttribute('contenteditable'));
    document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'));
  }

  // ── 幻灯片操作 ──
  _add(){
    const slides=document.querySelectorAll('#deck > section.slide');
    const curIdx=window.__currentSlideIndex||0;
    const cur=slides[curIdx];if(!cur)return;
    // 克隆当前 slide 作为模板
    const blank=cur.cloneNode(true);
    // 清理编辑痕迹
    blank.querySelectorAll('[contenteditable]').forEach(el=>{
      // 保留结构，清空文本
      if(el.children.length===0&&el.textContent.trim()){
        const oldHTML=el.innerHTML;
        el.textContent='';
        const cmd=new TextContentCommand(el,oldHTML,el.innerHTML);
        // 不记录到撤销栈（这是批量操作）
      }
    });
    blank.querySelectorAll('.pc,.dh,.ppt-anim').forEach(c=>c.remove());
    blank.querySelectorAll('.ps,.pw').forEach(c=>{c.classList.remove('ps','pw');c.removeAttribute('style');});
    // 清除动画属性
    blank.querySelectorAll('[data-ppt-anim]').forEach(e=>e.removeAttribute('data-ppt-anim'));
    cur.after(blank);
    this.cmd.execute(new SlideAddCommand(blank.outerHTML,curIdx+1,document.getElementById('deck')));
    this._rn();this._sb();
    go(curIdx+1);
    if(this.m==='edit')this._me();
    this._md();
    toast('已添加新页');
  }

  _dup(){
    const slides=document.querySelectorAll('#deck > section.slide');
    const curIdx=window.__currentSlideIndex||0;
    const cur=slides[curIdx];if(!cur)return;
    const dup=cur.cloneNode(true);
    // 清理编辑 UI
    dup.querySelectorAll('.pc,.dh').forEach(c=>c.remove());
    dup.querySelectorAll('.ps').forEach(c=>c.classList.remove('ps'));
    cur.after(dup);
    this.cmd.execute(new SlideAddCommand(dup.outerHTML,curIdx+1,document.getElementById('deck')));
    this._rn();this._sb();
    go(curIdx+1);
    if(this.m==='edit')this._me();
    this._md();
    toast('已复制');
  }

  _mv(i,d){
    const ss=[...document.querySelectorAll('#deck > section.slide')],j=i+d;
    if(j<0||j>=ss.length)return;
    const dk=document.getElementById('deck');
    this.cmd.execute(new SlideOrderCommand(dk,i,j));
    this._rn();this._sb();go(j);this._md();
  }

  _del(i){
    const ss=document.querySelectorAll('#deck > section.slide');
    if(ss.length<=1){toast('至少保留 1 页');return;}
    if(!confirm('删除第 '+(i+1)+' 页？'))return;
    const html=ss[i].outerHTML;
    const dk=document.getElementById('deck');
    this.cmd.execute(new SlideDeleteCommand(html,i,dk));
    this._rn();this._sb();go(Math.max(0,i-1));this._md();
  }

  _rn(){
    const ss=document.querySelectorAll('#deck > section.slide');
    ss.forEach((s,i)=>{
      s.innerHTML=s.innerHTML.replace(/>\d{2} \/ \d{2}</,`>${String(i+1).padStart(2,'0')} / ${ss.length}<`);
    });
  }

  // ── 缩放 ──
  _zoom(v){
    this.z=Math.max(0.4,Math.min(2,v||this.z));
    document.querySelectorAll('#deck > section.slide').forEach(s=>s.style.zoom=this.z);
    const el=document.getElementById('zm-v');if(el)el.textContent=Math.round(this.z*100)+'%';
  }

  // ── 侧栏（含拖拽排序）──
  _sb(){
    const sb=document.getElementById('ppt-sb');sb.innerHTML='';
    const slides=document.querySelectorAll('#deck > section.slide');
    slides.forEach((s,i)=>{
      const t=document.createElement('div');t.className='sb-t';t.dataset.i=i;
      // 缩略图克隆
      const clone=s.cloneNode(true);
      clone.className='sb-clone';
      clone.style.cssText='width:1600px;height:900px;transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none';
      // 清理克隆中的编辑器 UI
      clone.querySelectorAll('.pc,.dh,#ppt-bar,#ppt-sb,#ppt-in,#ppt-gd,#ppt-zm,#ppt-to').forEach(c=>c.remove());
      t.appendChild(clone);
      // 页码
      const num=document.createElement('div');num.className='sb-num';num.textContent=i+1;
      t.appendChild(num);
      // 点击导航
      t.onclick=()=>go(i);
      // 拖拽排序
      t.draggable=true;
      t.ondragstart=e=>{e.dataTransfer.setData('text/plain',i);};
      t.ondragover=e=>{e.preventDefault();t.classList.add('drag-over');};
      t.ondragleave=()=>t.classList.remove('drag-over');
      t.ondrop=e=>{
        e.preventDefault();t.classList.remove('drag-over');
        const from=+e.dataTransfer.getData('text/plain');
        const to=i;if(from===to)return;
        const dk=document.getElementById('deck');
        const all=[...dk.querySelectorAll(':scope > section.slide')];
        if(from<to)dk.insertBefore(all[from],all[to].nextSibling);
        else dk.insertBefore(all[from],all[to]);
        this._rn();this._sb();this._md();
      };
      sb.appendChild(t);
    });
    // 缩放缩略图
    requestAnimationFrame(()=>{
      sb.querySelectorAll('.sb-t').forEach(t=>{
        const clone=t.querySelector('.sb-clone');
        if(clone){const w=t.clientWidth;clone.style.transform='scale('+(w/1600)+')';}
      });
    });
    this._sa();
    // 包装 go 函数以更新侧栏高亮 + 应用切换效果
    if(!this._goWrapped){
      const orig=window.go;
      if(orig){window.go=n=>{
        const deck=document.getElementById('deck');
        const t=this.transition;
        if(t==='fade'&&deck){
          const origTrans=deck.style.transition;
          deck.style.transition='opacity .5s ease,transform .5s ease';
          deck.style.opacity='0';
          setTimeout(()=>{
            orig(n);deck.style.opacity='1';this._sa();
            setTimeout(()=>{deck.style.transition=origTrans;},600);
          },200);
        }else if(t==='zoom'&&deck){
          const origTrans=deck.style.transition;
          deck.style.transition='opacity .35s ease,transform .4s ease';
          deck.style.opacity='0';
          setTimeout(()=>{
            orig(n);deck.style.opacity='1';this._sa();
            setTimeout(()=>{deck.style.transition=origTrans;},500);
          },150);
        }else{
          orig(n);this._sa();
        }
      };this._goWrapped=1;}
    }
  }

  _sa(){
    const c=window.__currentSlideIndex||0;
    document.querySelectorAll('.sb-t').forEach((t,i)=>t.classList.toggle('on',i===c));
    // 同步备注面板 (如果打开)
    const panel=document.getElementById('ppt-notes-panel');
    if(panel&&panel.classList.contains('on')){
      const slides=document.querySelectorAll('#deck > section.slide');
      const el=slides[c];
      const slideLbl=document.getElementById('np-slide');
      if(slideLbl)slideLbl.textContent='第 '+(c+1)+' 页';
      const ta=document.getElementById('np-text');
      if(ta)ta.value=el?(el.getAttribute('data-notes')||''):'';
    }
  }

  // ── 图片拖拽 + 缩放 ──
  _drag(el){
    const Z=()=>this.z||1;let p=0,d=0,sx=0,sy=0,sl=0,st=0,origLeft=0,origTop=0;
    const mm=e=>{
      if(!p)return;
      if(!d){
        if(Math.abs(e.clientX-sx)<4&&Math.abs(e.clientY-sy)<4)return;
        d=1;
        const r=el.getBoundingClientRect(),pr=el.parentElement.getBoundingClientRect(),zz=Z();
        if(getComputedStyle(el).position!=='absolute'){
          el.style.position='absolute';
          el.style.width=Math.round(r.width/zz)+'px';
          el.style.height=Math.round(r.height/zz)+'px';
          el.style.left=Math.round((r.left-pr.left)/zz)+'px';
          el.style.top=Math.round((r.top-pr.top)/zz)+'px';
          el.style.maxWidth='none';el.style.maxHeight='none';
        }
        sl=parseFloat(el.style.left)||0;st=parseFloat(el.style.top)||0;
        origLeft=sl;origTop=st;
      }
      if(d){
        const zz=Z();
        el.style.left=(sl+(e.clientX-sx)/zz)+'px';
        el.style.top=(st+(e.clientY-sy)/zz)+'px';
        showGuides(el);this._md();
      }
    };
    const mu=()=>{
      if(p&&d){
        const nl=parseFloat(el.style.left)||0,nt=parseFloat(el.style.top)||0;
        if(nl!==origLeft||nt!==origTop){
          this.cmd.execute(new MoveCommand(el,origLeft,origTop,nl,nt));
        }
      }
      p=0;hideGuides();
    };
    el.addEventListener('mousedown',e=>{
      if(this.m!=='edit'||e.target.classList.contains('dh'))return;
      p=1;d=0;sx=e.clientX;sy=e.clientY;e.preventDefault();
    });
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
    this.dispose.push(()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);});

    // 四角缩放
    el.querySelectorAll('.dh.rs').forEach(h=>{
      let rs=0,rx=0,ry=0,rw=0,rh=0,rl=0,rt=0,origW=0,origH=0,origL=0,origT=0;
      h.addEventListener('mousedown',e=>{
        if(this.m!=='edit')return;
        rs=1;rx=e.clientX;ry=e.clientY;
        const r=el.getBoundingClientRect(),pr=el.parentElement.getBoundingClientRect(),zz=Z();
        if(getComputedStyle(el).position!=='absolute'){
          el.style.position='absolute';el.style.width=Math.round(r.width/zz)+'px';el.style.height=Math.round(r.height/zz)+'px';
          el.style.left=Math.round((r.left-pr.left)/zz)+'px';el.style.top=Math.round((r.top-pr.top)/zz)+'px';
          el.style.maxWidth='none';el.style.maxHeight='none';
        }
        rw=r.width/zz;rh=r.height/zz;rl=parseFloat(el.style.left)||0;rt=parseFloat(el.style.top)||0;
        origW=rw;origH=rh;origL=rl;origT=rt;
        el.style.aspectRatio='auto';
        e.preventDefault();e.stopPropagation();
        const c=h.dataset.c,isL=c==='tl'||c==='bl',isT=c==='tl'||c==='tr';
        const rm=e=>{
          if(!rs)return;
          const zz=Z(),dx=(e.clientX-rx)/zz,dy=(e.clientY-ry)/zz;
          let s=(rw+(isL?-dx:dx))/rw;s=Math.max(0.25,Math.min(4,s));
          const nw=rw*s,nh=rh*s,nl=isL?rl-(nw-rw):rl,nt=isT?rt-(nh-rh):rt;
          el.style.width=Math.round(nw)+'px';el.style.height=Math.round(nh)+'px';
          el.style.left=Math.round(nl)+'px';el.style.top=Math.round(nt)+'px';
          this._md();
        };
        const ru=()=>{
          if(rs){
            const nw=parseFloat(el.style.width)||rw,nh=parseFloat(el.style.height)||rh;
            const nl=parseFloat(el.style.left)||rl,nt=parseFloat(el.style.top)||rt;
            if(nw!==origW||nh!==origH||nl!==origL||nt!==origT){
              this.cmd.execute(new ResizeCommand(el,origW,origH,origL,origT,nw,nh,nl,nt));
            }
          }
          rs=0;document.removeEventListener('mousemove',rm);document.removeEventListener('mouseup',ru);
        };
        document.addEventListener('mousemove',rm);document.addEventListener('mouseup',ru);
        this.dispose.push(()=>{document.removeEventListener('mousemove',rm);document.removeEventListener('mouseup',ru);});
      });
    });
  }

  // ── 检查器面板 ──
  _ins(el){
    this.sel=el;
    document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'));
    el.classList.add('ps');
    const ins=document.getElementById('ppt-in');

    if(el.classList.contains('pw')){
      // 图片检查器
      const img=el.querySelector('img'),cs=getComputedStyle(img),wcs=getComputedStyle(el);
      const mh=parseInt(wcs.maxHeight)||0,mhVh=mh?Math.round(mh/window.innerHeight*100):0;
      const r=Math.round(parseFloat(wcs.borderRadius))||0;
      const bm=(cs.filter.match(/brightness\(([\d.]+)\)/)||[])[1],bPct=Math.round((bm||1)*100);
      const curAnim=el.getAttribute('data-ppt-anim')||'';
      ins.innerHTML=
        `<div class="is"><div class="ih">图片</div>`+
        `<div class="ir"><input type="text" id="iu" placeholder="URL" value="${img.src.startsWith('data:')?'':img.src}" style="width:100%"></div>`+
        `<div class="ir"><input type="file" id="if" accept="image/*" style="font-size:11px;width:100%"></div></div>`+
        `<div class="is"><div class="ih">尺寸</div>`+
        `<div class="ib">${['1 / 1','4 / 3','3 / 4','16 / 9'].map(v=>`<button class="ib btn" data-r="${v}">${v}</button>`).join('')}</div>`+
        `<div class="ir"><label>最大高 ${mhVh}vh</label><input type="range" id="im" min="0" max="55" value="${mhVh}"></div></div>`+
        `<div class="is"><div class="ih">样式</div>`+
        `<div class="ib"><button class="ib btn ${cs.objectFit==='cover'?'on':''}" data-f="cover">填满</button>`+
        `<button class="ib btn ${cs.objectFit==='contain'?'on':''}" data-f="contain">完整</button></div>`+
        `<div class="ir"><label>圆角 ${r}px</label><input type="range" id="ir" min="0" max="40" value="${r}"></div>`+
        `<div class="ir"><label>亮度 ${bPct}%</label><input type="range" id="ib" min="40" max="120" value="${bPct}"></div>`+
        `<div class="ir"><label>边框</label><input type="color" id="ic" value="${rgbHex(wcs.borderColor)}"></div></div>`+
        `<div class="is"><div class="ih">动画</div>`+
        `<div class="ir"><select id="ia" style="width:100%"><option value="">无</option>${
          ['fadeIn','fadeInUp','fadeInDown','fadeInLeft','fadeInRight','zoomIn','slideInLeft','slideInRight','pulse','shake','flipX']
          .map(a=>`<option value="${a}" ${curAnim===a?'selected':''}>${a}</option>`).join('')
        }</select></div></div>`+
        `<div class="is"><button class="ib btn" id="irr" style="width:100%">↺ 重置</button></div>`;

      // 绑定事件
      document.getElementById('iu').onchange=e=>{if(e.target.value.trim()){img.src=e.target.value.trim();this._md();}};
      document.getElementById('if').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{img.src=r.result;this._md();};r.readAsDataURL(f);};
      ins.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{el.style.aspectRatio=b.dataset.r;el.style.height='auto';this._md();});
      document.getElementById('im').oninput=e=>{el.style.maxHeight=e.target.value+'vh';e.target.previousElementSibling.textContent='最大高 '+e.target.value+'vh';this._md();};
      ins.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ins.querySelectorAll('[data-f]').forEach(x=>x.classList.remove('on'));b.classList.add('on');img.style.objectFit=b.dataset.f;this._md();});
      document.getElementById('ir').oninput=e=>{el.style.borderRadius=e.target.value+'px';e.target.previousElementSibling.textContent='圆角 '+e.target.value+'px';this._md();};
      document.getElementById('ib').oninput=e=>{img.style.filter='brightness('+(e.target.value/100)+')';e.target.previousElementSibling.textContent='亮度 '+e.target.value+'%';this._md();};
      document.getElementById('ic').oninput=e=>{el.style.borderColor=e.target.value;this._md();};
      document.getElementById('ia').onchange=e=>{
        const v=e.target.value;
        if(v)el.setAttribute('data-ppt-anim',v);
        else el.removeAttribute('data-ppt-anim');
        this._md();
      };
      document.getElementById('irr').onclick=()=>{el.removeAttribute('style');img.removeAttribute('style');el.removeAttribute('data-ppt-anim');this._ins(el);this._md();};

    }else{
      // 文字检查器
      const cs=getComputedStyle(el),fs=Math.round(parseFloat(cs.fontSize))||16;
      const fw=cs.fontWeight,it=cs.fontStyle==='italic',al=cs.textAlign;
      const lh=cs.lineHeight,ls=cs.letterSpacing;
      const curAnim=el.getAttribute('data-ppt-anim')||'';
      ins.innerHTML=
        `<div class="is"><div class="ih">${el.tagName.toLowerCase()} · 文字</div>`+
        `<div class="ir"><label>字号</label><input type="number" id="ifs" value="${fs}" min="8" max="200"></div>`+
        `<div class="ir"><label>颜色</label><input type="color" id="ico" value="${rgbHex(cs.color)}"></div></div>`+
        `<div class="is"><div class="ih">样式</div>`+
        `<div class="ib"><button class="ib btn ${fw>=600?'on':''}" id="ibd" style="font-weight:700">B</button>`+
        `<button class="ib btn ${it?'on':''}" id="iit" style="font-style:italic">I</button></div></div>`+
        `<div class="is"><div class="ih">对齐</div>`+
        `<div class="ib">${['left','center','right'].map(v=>`<button class="ib btn ${al===v?'on':''}" data-al="${v}">${v==='left'?'左':v==='center'?'中':'右'}</button>`).join('')}</div></div>`+
        `<div class="is"><div class="ih">间距</div>`+
        `<div class="ir"><label>行高</label><input type="text" id="ilh" value="${lh}" style="width:70px"></div>`+
        `<div class="ir"><label>字距</label><input type="text" id="ils" value="${ls==='normal'?'0px':ls}" style="width:70px"></div></div>`+
        `<div class="is"><div class="ih">动画</div>`+
        `<div class="ir"><select id="ia" style="width:100%"><option value="">无</option>${
          ['fadeIn','fadeInUp','fadeInDown','fadeInLeft','fadeInRight','zoomIn','slideInLeft','slideInRight','pulse','shake','flipX']
          .map(a=>`<option value="${a}" ${curAnim===a?'selected':''}>${a}</option>`).join('')
        }</select></div></div>`;

      // 绑定事件
      document.getElementById('ifs').oninput=e=>this._sty(el,'fontSize',e.target.value+'px');
      document.getElementById('ico').oninput=e=>this._sty(el,'color',e.target.value);
      document.getElementById('ibd').onclick=()=>{
        const v=el.style.fontWeight==='700'?'400':'700';
        this._sty(el,'fontWeight',v);document.getElementById('ibd').classList.toggle('on');
      };
      document.getElementById('iit').onclick=()=>{
        const v=el.style.fontStyle==='italic'?'normal':'italic';
        this._sty(el,'fontStyle',v);document.getElementById('iit').classList.toggle('on');
      };
      ins.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{
        ins.querySelectorAll('[data-al]').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');this._sty(el,'textAlign',b.dataset.al);
      });
      document.getElementById('ilh').oninput=e=>this._sty(el,'lineHeight',e.target.value);
      document.getElementById('ils').oninput=e=>this._sty(el,'letterSpacing',e.target.value);
      document.getElementById('ia').onchange=e=>{
        const v=e.target.value;
        if(v)el.setAttribute('data-ppt-anim',v);
        else el.removeAttribute('data-ppt-anim');
        this._md();
      };
    }
  }

  _sty(el,p,val){
    const old=el.style[p];
    this.cmd.execute(new StyleCommand(el,p,old,val));
    this._md();
  }

  _clr(){
    this.sel=null;
    document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'));
    document.getElementById('ppt-in').innerHTML='<div class="ie">选中元素查看属性<br>或点击幻灯片空白区域查看幻灯片属性</div>';
  }

  // ═══════════════════════════════════════════════════════════════
  // 新增：插入元素系统
  // ═══════════════════════════════════════════════════════════════
  _insert(type){
    const {el:slide}=this._curSlide();if(!slide)return;
    if(type==='table'){
      this._dialog('插入表格',
        '<label>行数</label><input type="number" id="dia-rows" value="3" min="1" max="20">'+
        '<label>列数</label><input type="number" id="dia-cols" value="3" min="1" max="10">',
        ()=>{
          const rows=+document.getElementById('dia-rows').value||3;
          const cols=+document.getElementById('dia-cols').value||3;
          const t=document.createElement('table');t.className='ppt-table';
          let html='<thead><tr>';
          for(let c=0;c<cols;c++)html+='<th>标题'+(c+1)+'</th>';
          html+='</tr></thead><tbody>';
          for(let r=0;r<rows-1;r++){
            html+='<tr>';
            for(let c=0;c<cols;c++)html+='<td>内容</td>';
            html+='</tr>';
          }
          html+='</tbody>';t.innerHTML=html;
          t.style.position='absolute';t.style.left='10%';t.style.top='30%';t.style.width='80%';
          this._addEl(t,slide);
        });
    }else if(type==='code'){
      this._dialog('插入代码块',
        '<label>语言</label><select id="dia-lang">'+
        '<option value="">Plain</option><option value="javascript">JavaScript</option><option value="python">Python</option>'+
        '<option value="html">HTML</option><option value="css">CSS</option><option value="rust">Rust</option><option value="bash">Bash</option></select>'+
        '<label>代码</label><textarea id="dia-code" placeholder="粘贴代码..."></textarea>',
        ()=>{
          const lang=document.getElementById('dia-lang').value;
          const code=document.getElementById('dia-code').value;
          const pre=document.createElement('pre');pre.className='ppt-code-block';
          if(lang)pre.classList.add('language-'+lang);
          const cd=document.createElement('code');cd.textContent=code;
          pre.appendChild(cd);pre.style.position='absolute';pre.style.left='10%';pre.style.top='25%';pre.style.width='80%';
          this._addEl(pre,slide);
        });
    }else if(type==='shape'){
      this._dialog('插入形状',
        '<div class="ib" style="margin-bottom:10px"><button data-shape="rect" class="ib btn on" style="width:80px;height:40px;background:#ff6b35;border-radius:4px">矩形</button>'+
        '<button data-shape="circle" class="ib btn" style="width:40px;height:40px;background:#ff6b35;border-radius:50%">圆形</button>'+
        '<button data-shape="arrow" class="ib btn" style="width:80px;height:40px;background:#ff6b35;border-radius:2px">箭头</button></div>'+
        '<label>宽度 (px)</label><input type="number" id="dia-sw" value="120">'+
        '<label>高度 (px)</label><input type="number" id="dia-sh" value="80">'+
        '<label>颜色</label><input type="color" id="dia-sc" value="#ff6b35">',
        ()=>{
          const w=+document.getElementById('dia-sw').value||120;
          const h=+document.getElementById('dia-sh').value||80;
          const c=document.getElementById('dia-sc').value;
          const d=document.createElement('div');
          d.className='ppt-shape-rect';d.style.width=w+'px';d.style.height=h+'px';
          d.style.background=c;d.style.position='absolute';d.style.left='40%';d.style.top='40%';
          this._addEl(d,slide);
        });
    }else if(type==='video'){
      this._dialog('嵌入视频 / iframe',
        '<label>URL (YouTube / Vimeo / 任意 URL)</label><input type="text" id="dia-url" placeholder="https://...">'+
        '<label>宽度 (%)</label><input type="number" id="dia-vw" value="80" min="10" max="100">'+
        '<label>高度 (px)</label><input type="number" id="dia-vh" value="400" min="100">',
        ()=>{
          let url=document.getElementById('dia-url').value.trim();
          if(!url)return toast('请输入 URL');
          const vw=+document.getElementById('dia-vw').value||80;
          const vh=+document.getElementById('dia-vh').value||400;
          if(url.includes('youtube.com/watch?v=')){
            const id=new URL(url).searchParams.get('v');
            url='https://www.youtube.com/embed/'+id;
          }else if(url.includes('youtu.be/')){
            url='https://www.youtube.com/embed/'+url.split('youtu.be/')[1].split('?')[0];
          }
          const iframe=document.createElement('iframe');
          iframe.src=url;iframe.style.width=vw+'%';iframe.style.height=vh+'px';
          iframe.style.border='none';iframe.style.borderRadius='8px';
          iframe.style.position='absolute';iframe.style.left=((100-vw)/2)+'%';iframe.style.top='20%';
          iframe.setAttribute('allowfullscreen','');
          this._addEl(iframe,slide);
        });
    }else if(type==='quote'){
      const bq=document.createElement('blockquote');bq.className='ppt-blockquote';
      bq.textContent='在这里输入引用内容...';
      bq.style.position='absolute';bq.style.left='15%';bq.style.top='35%';bq.style.width='70%';
      bq.setAttribute('contenteditable','true');
      this._addEl(bq,slide);
    }else if(type==='image'){
      this._dialog('插入图片',
        '<label>图片 URL</label><input type="text" id="dia-iurl" placeholder="https://...">'+
        '<label>或上传文件</label><input type="file" id="dia-if" accept="image/*">',
        ()=>{
          const url=document.getElementById('dia-iurl').value.trim();
          const file=document.getElementById('dia-if').files[0];
          const img=document.createElement('img');
          img.style.maxWidth='60%';img.style.position='absolute';img.style.left='20%';img.style.top='20%';
          const wrap=document.createElement('div');wrap.className='pw';wrap.appendChild(img);
          if(url){img.src=url;this._addEl(wrap,slide);}
          else if(file){const r=new FileReader();r.onload=()=>{img.src=r.result;this._addEl(wrap,slide);};r.readAsDataURL(file);}
          else{toast('请选择图片');return;}
          ['tl','tr','bl','br'].forEach(c=>{const h=document.createElement('div');h.className='dh rs '+c;h.dataset.c=c;wrap.appendChild(h);});
          this._drag(wrap);
        });
    }else if(type==='text'){
      const d=document.createElement('div');d.textContent='文本框';d.setAttribute('contenteditable','true');
      d.style.position='absolute';d.style.left='40%';d.style.top='40%';d.style.padding='8px 12px';
      d.style.color='#fff';d.style.fontSize='18px';d.style.background='rgba(255,255,255,.08)';
      d.style.borderRadius='4px';d.style.minWidth='120px';
      this._addEl(d,slide);
    }
  }
  _addEl(el,container){
    this.cmd.execute(new ElementAddCommand(el,container));
    if(this.m==='edit')this._me();
    this._ins(el);this._md();
    toast('已插入');
  }
  _dialog(title,html,onConfirm){
    const ov=document.getElementById('ppt-dialog-overlay');
    const dia=document.getElementById('ppt-dialog');
    dia.innerHTML='<h3>'+title+'</h3>'+html+'<div class="dia-btns"><button id="dia-cl">取消</button><button id="dia-ok" class="pri">确定</button></div>';
    ov.classList.add('on');dia.classList.add('on');
    document.getElementById('dia-cl').onclick=()=>this._hideDialog();
    document.getElementById('dia-ok').onclick=()=>{onConfirm();this._hideDialog();};
  }
  _hideDialog(){document.getElementById('ppt-dialog-overlay').classList.remove('on');document.getElementById('ppt-dialog').classList.remove('on');}

  // ═══════════════════════════════════════════════════════════════
  // 新增：查找替换
  // ═══════════════════════════════════════════════════════════════
  _showFind(){const f=document.getElementById('ppt-find');f.classList.add('on');document.getElementById('fr-f').focus();this._findIdx=-1;this._findEls=[];}
  _hideFind(){document.getElementById('ppt-find').classList.remove('on');this._findEls.forEach(s=>s.classList.remove('ps'));this._findEls=[];this._findIdx=-1;}
  _findAll(){
    const q=document.getElementById('fr-f').value.trim();if(!q)return [];
    const els=[];document.querySelectorAll('#deck > section.slide [contenteditable="true"]').forEach(el=>{
      if(el.textContent.includes(q))els.push(el);
    });
    return els;
  }
  _findNext(){
    const q=document.getElementById('fr-f').value.trim();if(!q)return;
    this._findEls.forEach(s=>s.classList.remove('ps'));
    this._findEls=this._findAll();const stat=document.getElementById('fr-st');
    if(!this._findEls.length){stat.textContent='0/0';toast('未找到');return;}
    this._findIdx=(this._findIdx+1)%this._findEls.length;
    const el=this._findEls[this._findIdx];el.classList.add('ps');el.scrollIntoView({behavior:'smooth',block:'center'});
    stat.textContent=(this._findIdx+1)+'/'+this._findEls.length;
  }
  _findReplace(){
    const q=document.getElementById('fr-f').value.trim(),r=document.getElementById('fr-r').value;
    if(!q||!this._findEls.length)return;
    const el=this._findEls[this._findIdx];
    if(!el||!el.textContent.includes(q))return;
    const oldHTML=el.innerHTML;
    el.innerHTML=el.innerHTML.split(q).join(r);
    this.cmd.execute(new TextContentCommand(el,oldHTML,el.innerHTML));
    this._findEls=this._findAll();this._findIdx=-1;
    document.getElementById('fr-st').textContent=this._findEls.length+' 处';
    this._md();
  }
  _findReplaceAll(){
    const q=document.getElementById('fr-f').value.trim(),r=document.getElementById('fr-r').value;
    if(!q)return;
    let count=0;
    document.querySelectorAll('#deck > section.slide [contenteditable="true"]').forEach(el=>{
      if(el.textContent.includes(q)){
        const oldHTML=el.innerHTML;
        el.innerHTML=el.innerHTML.split(q).join(r);
        if(el.innerHTML!==oldHTML){this.cmd.execute(new TextContentCommand(el,oldHTML,el.innerHTML));count++;}
      }
    });
    toast('已替换 '+count+' 处');this._md();
  }

  // ═══════════════════════════════════════════════════════════════
  // 新增：全局字体面板
  // ═══════════════════════════════════════════════════════════════
  _showFontPanel(){
    const p=document.getElementById('ppt-font-panel');p.classList.add('on');
    document.getElementById('fp-ap').onclick=()=>this._applyFont();
    document.getElementById('fp-cl').onclick=()=>this._hideFontPanel();
  }
  _hideFontPanel(){document.getElementById('ppt-font-panel').classList.remove('on');}
  _applyFont(){
    const f=document.getElementById('fp-f').value;
    const s=document.getElementById('fp-s').value;
    const c=document.getElementById('fp-c').value;
    const b=document.getElementById('fp-b').value;
    const l=document.getElementById('fp-l').value;
    document.querySelectorAll('#deck > section.slide').forEach(slide=>{
      if(f)slide.style.fontFamily=f;
      if(s)slide.style.fontSize=s+'px';
      if(c)slide.style.color=c;
      if(b)slide.style.background=b;
      if(l)slide.style.lineHeight=l;
    });
    this._hideFontPanel();this._md();toast('全局字体已应用');
  }

  // ═══════════════════════════════════════════════════════════════
  // 新增：幻灯片母版
  // ═══════════════════════════════════════════════════════════════
  _showMasterPanel(){
    const p=document.getElementById('ppt-master-panel');p.classList.add('on');
    const m=this._master;
    if(m.fontFamily)document.getElementById('mp-f').value=m.fontFamily;
    if(m.fontSize)document.getElementById('mp-s').value=m.fontSize;
    if(m.color)document.getElementById('mp-c').value=m.color;
    if(m.bgColor)document.getElementById('mp-b').value=m.bgColor;
    if(m.lineHeight)document.getElementById('mp-l').value=m.lineHeight;
    document.getElementById('mp-ap').onclick=()=>this._applyMaster();
    document.getElementById('mp-cl').onclick=()=>this._hideMasterPanel();
  }
  _hideMasterPanel(){document.getElementById('ppt-master-panel').classList.remove('on');}
  _applyMaster(){
    this._master.fontFamily=document.getElementById('mp-f').value;
    this._master.fontSize=document.getElementById('mp-s').value;
    this._master.color=document.getElementById('mp-c').value;
    this._master.bgColor=document.getElementById('mp-b').value;
    this._master.lineHeight=document.getElementById('mp-l').value;
    document.querySelectorAll('#deck > section.slide').forEach(s=>{
      if(this._master.fontFamily)s.style.fontFamily=this._master.fontFamily;
      if(this._master.fontSize)s.style.fontSize=this._master.fontSize+'px';
      if(this._master.color)s.style.color=this._master.color;
      if(this._master.bgColor)s.style.background=this._master.bgColor;
      if(this._master.lineHeight)s.style.lineHeight=this._master.lineHeight;
    });
    this._hideMasterPanel();this._md();toast('母版已应用');
  }

  // ═══════════════════════════════════════════════════════════════
  // 新增：幻灯片级别检查器
  // ═══════════════════════════════════════════════════════════════
  _slideInspector(el){
    this.sel=el;
    document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'));
    el.classList.add('ps');
    const ins=document.getElementById('ppt-in');
    const cs=getComputedStyle(el);
    const bg=rgbHex(cs.backgroundColor);
    const trans=el.getAttribute('data-transition')||this.transition||'fade';
    const layout=el.getAttribute('data-layout')||'custom';
    ins.innerHTML=
      `<div class="is"><div class="ih">幻灯片属性</div>`+
      `<div class="ir"><label>背景色</label><input type="color" id="si-bg" value="${bg}"></div>`+
      `<div class="ir"><label>过渡效果</label><select id="si-trans" style="width:100px"><option value="fade">淡入</option><option value="slide">滑动</option><option value="zoom">缩放</option><option value="none">无</option></select></div>`+
      `<div class="ir"><label>布局模板</label><select id="si-layout" style="width:100px"><option value="custom">自定义</option><option value="title">标题页</option><option value="content">内容页</option><option value="two-col">双栏</option><option value="blank">空白</option></select></div></div>`+
      `<div class="is"><div class="ih">操作</div>`+
      `<div class="ib"><button id="si-clr" class="ib btn">清除背景</button>`+
      `<button id="si-reset" class="ib btn">重置样式</button></div></div>`;
    document.getElementById('si-bg').oninput=e=>{this._slideSty(el,'backgroundColor',e.target.value);};
    document.getElementById('si-trans').value=trans;
    document.getElementById('si-trans').onchange=e=>{
      const v=e.target.value;
      if(v==='none')el.removeAttribute('data-transition');else el.setAttribute('data-transition',v);
      this._md();
    };
    document.getElementById('si-layout').value=layout;
    document.getElementById('si-layout').onchange=e=>{el.setAttribute('data-layout',e.target.value);this._md();};
    document.getElementById('si-clr').onclick=()=>{el.style.backgroundColor='';this._slideInspector(el);this._md();};
    document.getElementById('si-reset').onclick=()=>{el.removeAttribute('style');this._slideInspector(el);this._md();};
  }
  _slideSty(el,p,val){
    const old=el.style[p];
    this.cmd.execute(new SlideStyleCommand(el,p,old,val));
    this._md();
  }

  // ── 当前 slide 辅助 ──
  _curSlide(){
    const idx=window.__currentSlideIndex||0;
    const slides=document.querySelectorAll('#deck > section.slide');
    return {idx,el:slides[idx],total:slides.length};
  }

  // ── 演讲者备注面板 ──
  _toggleNotes(){
    const panel=document.getElementById('ppt-notes-panel');
    if(!panel)return;
    const on=panel.classList.toggle('on');
    if(on){
      const{idx,el}=this._curSlide();
      const slideLbl=document.getElementById('np-slide');
      if(slideLbl)slideLbl.textContent='第 '+(idx+1)+' 页';
      const ta=document.getElementById('np-text');
      if(ta){ta.value=el?(el.getAttribute('data-notes')||''):'';ta.focus();}
    }
  }

  // ── 导出 PDF ──
  _exportPDF(){
    // 注入打印样式
    let ps=document.getElementById('ppt-print-css');
    if(!ps){
      ps=document.createElement('style');ps.id='ppt-print-css';
      ps.textContent='@media print{@page{size:landscape;margin:0}html,body{overflow:visible!important;width:auto!important;height:auto!important}#deck{position:static!important;width:auto!important;height:auto!important;display:block!important;transform:none!important;transition:none!important}#deck>section.slide{width:100vw!important;height:100vh!important;page-break-after:always;break-after:page;page-break-inside:avoid;break-inside:avoid;transform:none!important;opacity:1!important;display:block!important}#deck>section.slide:last-child{page-break-after:auto}#ppt-bar,#ppt-sb,#ppt-in,#ppt-gd,#ppt-zm,#ppt-to,#ppt-notes-panel,.pc,.dh,#nav,#hint{display:none!important}[data-anim]{opacity:1!important;transform:none!important}canvas.bg{display:none!important}}';
      document.head.appendChild(ps);
    }
    // 揭示所有动画元素
    document.querySelectorAll('[data-anim]').forEach(e=>{e.style.opacity='1';e.style.transform='none';});
    toast('准备打印…请在弹窗选择「另存为 PDF」',3000);
    setTimeout(()=>window.print(),300);
  }

  // ── 进入演示模式 (新标签页) ──
  async _present(){
    // 有未保存修改时先保存, 确保演示看到最新内容
    if(this.d){
      toast('正在保存…',1500);
      await this._save();
    }
    const url='/view?file='+encodeURIComponent(this.fn);
    window.open(url,'_blank');
    toast('已在新标签页打开演示 · N备注 · T计时 · P导出PDF',3000);
  }

  // ── 保存 ──
  async _save(){
    const was=this.m==='edit';if(was)this._toggle(0);
    document.querySelectorAll('.pc,.dh').forEach(c=>c.remove());
    document.querySelectorAll('.ps,.pw').forEach(c=>c.classList.remove('ps','pw'));
    document.querySelectorAll('#deck > section.slide').forEach(s=>s.style.zoom='');
    // 隐藏编辑器 UI
    const ui=['ppt-bar','ppt-sb','ppt-in','ppt-gd','ppt-zm','ppt-to'];
    ui.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
    const html='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
    ui.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
    const st=document.getElementById('eb-st');st.textContent='保存中...';st.style.color='#888';
    try{
      const b=new URLSearchParams();b.append('html',html);b.append('file',this.fn);
      const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b.toString()});
      const d=await r.json();
      if(d.ok){this.d=0;st.textContent='已保存';st.style.color='#52c41a';toast('✓ 已保存');if(d.name)this.fn=d.name;}
      else{st.textContent='失败';st.style.color='#ff6b6b';}
    }catch(e){st.textContent='出错';st.style.color='#ff6b6b';}
    if(was)setTimeout(()=>this._toggle(1),200);
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. 启动
// ═══════════════════════════════════════════════════════════════
window.__pptEditor=new PPTEditor().start();

})();
