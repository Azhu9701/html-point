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
`;

// 注入 CSS
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:CSS}));

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
  }

  start(){this._ui();this._bind();this._fn();this._injectTransitions();return this;}
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
    if(document.getElementById('ppt-bar'))return;
    // 工具栏
    const bar=document.createElement('div');bar.id='ppt-bar';
    bar.innerHTML='<span style="color:#ff6b35;font-weight:700;font-size:11px">▶</span>'+
      '<button id="eb-t" class="pri">编辑</button>'+
      '<span class="sp"></span>'+
      '<button id="eb-add" class="icon" title="新增页">＋</button>'+
      '<button id="eb-dup" class="icon" title="复制页">⧉</button>'+
      '<button id="eb-del" class="icon danger" title="删除页">🗑</button>'+
      '<span class="sp"></span>'+
      '<select id="eb-trans" title="切换效果"><option value="fade">淡入</option><option value="slide">滑动</option><option value="zoom">缩放</option><option value="none">无</option></select>'+
      '<span class="sp"></span>'+
      '<button id="eb-s" class="pri">💾 保存</button>'+
      '<span class="st" id="eb-st">已加载</span>'+
      '<span id="eb-fn" style="color:#888;font-size:11px;border-left:1px solid #333;padding-left:8px;margin-left:4px"></span>'+
      '<button id="eb-h">？</button>';
    document.body.appendChild(bar);

    // 侧栏、检查器、参考线、缩放条、Toast
    [{id:'ppt-sb'},{id:'ppt-in',h:'<div class="ie">选中元素查看属性</div>'},{id:'ppt-gd'},
     {id:'ppt-zm',h:'<button id="zm-o">−</button><span class="zv" id="zm-v">100%</span><button id="zm-i">＋</button><button id="zm-f">⤢</button>'},
     {id:'ppt-to'}].forEach(d=>{
      const e=document.createElement('div');e.id=d.id;if(d.h)e.innerHTML=d.h;document.body.appendChild(e);
    });
  }

  // ── 事件绑定 ──
  _bind(){
    document.getElementById('eb-t').onclick=()=>this._toggle();
    document.getElementById('eb-add').onclick=()=>this._add();
    document.getElementById('eb-dup').onclick=()=>this._dup();
    document.getElementById('eb-del').onclick=()=>this._del(window.__currentSlideIndex||0);
    document.getElementById('eb-s').onclick=()=>this._save();
    document.getElementById('eb-h').onclick=()=>toast('＋新增 ⧉复制 🗑删除 · 左栏拖拽排序 · Cmd+S保存 · Cmd+Z撤销 · Esc取消',5000);

    const transSel=document.getElementById('eb-trans');
    if(transSel)transSel.onchange=()=>{this.transition=transSel.value;this._applyTransition();};

    [['zm-o',-0.1],['zm-i',0.1],['zm-f',0]].forEach(([id,v])=>{
      const el=document.getElementById(id);if(el)el.onclick=()=>this._zoom(v?v:1);
    });

    const onKey=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();this._save();}
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)this.cmd.redo();else this.cmd.undo();}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();this.cmd.redo();}
      if(e.key==='Escape'){this._clr();hideGuides();}
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
      toast('点文字编辑 · 点图拖拽缩放 · 右栏调属性 · 左栏拖拽排序',3500);
    }else{
      this._ue();hideGuides();this._clr();this._zoom(1);
    }
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
      // 文字选中
      s.addEventListener('focusin',e=>{
        if(this.m==='edit'&&e.target.getAttribute('contenteditable')==='true')this._ins(e.target);
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
    if(d>0)dk.insertBefore(ss[i],ss[j].nextSibling);
    else dk.insertBefore(ss[i],ss[j]);
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
    document.getElementById('ppt-in').innerHTML='<div class="ie">选中元素查看属性</div>';
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
