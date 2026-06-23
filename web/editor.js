/* ============================================================
   HTML Point v2 · Keynote 风格编辑器
   Class 化 + UndoManager + CSS 变量布局
   ============================================================ */
(function(){
'use strict';
if(window.__PPT_EDITOR_LOADED__) return;
window.__PPT_EDITOR_LOADED__ = true;

class UndoManager {
  constructor(max=100){this._stack=[];this._idx=-1;this._max=max}
  push(el,prop,oldVal,newVal){if(oldVal===newVal)return;this._stack=this._stack.slice(0,this._idx+1);
    this._stack.push({el,prop,oldVal,newVal});if(this._stack.length>this._max)this._stack.shift();this._idx=this._stack.length-1}
  undo(){if(this._idx<0)return false;const a=this._stack[this._idx];a.el.style[a.prop]=a.oldVal;this._idx--;return true}
  redo(){if(this._idx>=this._stack.length-1)return false;this._idx++;const a=this._stack[this._idx];a.el.style[a.prop]=a.newVal;return true}
  clear(){this._stack=[];this._idx=-1}
}
function rgbHex(c){if(!c||c==='transparent')return'#333333';if(c.startsWith('#'))return c.length===4?'#'+c.slice(1).split('').map(x=>x+x).join(''):c.slice(0,7);const m=c.match(/\d+/g);if(!m)return'#fff';return'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('')}
function toast(m,t=2000){const e=document.getElementById('ppt-toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),t)}
function ceUndo(){try{return document.execCommand('undo')}catch{return 0}}
function showGuides(el){const g=document.getElementById('ppt-guides');if(!g)return;g.classList.add('show');g.innerHTML='';const s=el.closest('section.slide');if(!s)return;const sr=s.getBoundingClientRect(),er=el.getBoundingClientRect();if(Math.abs(er.left+er.width/2-sr.left-sr.width/2)<6){const v=document.createElement('div');v.className='ppt-guide v';v.style.left=(sr.left+sr.width/2)+'px';g.appendChild(v);el.style.left=(sr.width/2-er.width/2)+'px'}}
function hideGuides(){const g=document.getElementById('ppt-guides');if(g){g.classList.remove('show');g.innerHTML=''}}

const CSS=`:root{--hp-sb:170px;--hp-in:250px}
@media(max-width:1400px){:root{--hp-sb:140px;--hp-in:200px}}
@media(max-width:1100px){:root{--hp-sb:110px;--hp-in:160px}}
#ppt-bar{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;align-items:center;background:#1c1c1e;border:1px solid #3a3a3c;border-radius:10px;padding:6px 10px;font-family:-apple-system,"PingFang SC",sans-serif;font-size:13px;max-width:94vw;flex-wrap:wrap;justify-content:center}
#ppt-bar button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 11px;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap}
#ppt-bar button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-bar button.pri{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35;font-weight:600}
#ppt-bar .sp{width:1px;height:20px;background:#3a3a3c;margin:0 3px}
#ppt-bar .st{font-size:11px;color:#888;margin-left:2px;min-width:50px}
#ppt-sb{position:fixed;left:0;top:0;bottom:0;width:var(--hp-sb);background:#141416;border-right:1px solid #2c2c2e;z-index:9998;overflow-y:auto;padding:52px 8px 12px;display:none}
#ppt-sb.on{display:block}
.sb-t{position:relative;width:100%;aspect-ratio:16/9;background:#0a0a0a;border:2px solid transparent;border-radius:6px;margin-bottom:8px;cursor:pointer}
.sb-t:hover{border-color:#5a5a5a}.sb-t.on{border-color:#ff6b35}
#ppt-in{position:fixed;right:0;top:0;bottom:0;width:var(--hp-in);background:#1c1c1e;border-left:1px solid #3a3a3c;z-index:9998;overflow-y:auto;padding:52px 12px 12px;display:none;font-family:-apple-system,"PingFang SC",sans-serif}
#ppt-in.on{display:block}
#ppt-in .ie{color:#666;font-size:12px;text-align:center;margin-top:40px}
.is{border-bottom:1px solid #2c2c2e;padding:10px 0}.is:last-child{border-bottom:0}
.is .ih{color:#ff6b35;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.ir{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:12px;color:#bbb}
.ir label{flex-shrink:0}
.ir input[type=number],.ir input[type=text]{background:#1c1c1e;color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:4px 6px;font-size:12px;width:70px;font-family:inherit}
.ir input[type=range]{flex:1;margin-left:8px}
.ir input[type=color]{width:32px;height:26px;border:1px solid #3a3a3c;border-radius:5px;background:#1c1c1e;cursor:pointer;padding:2px}
.ib{display:flex;gap:4px;flex-wrap:wrap}
.ib button{background:#2c2c2e;color:#ccc;border:1px solid #3a3a3c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:inherit}
.ib button.on,.ib button:hover{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35}
.ps{box-shadow:0 0 0 2px #00d4ff!important}
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
#ppt-gd{position:fixed;inset:0;pointer-events:none;z-index:9997;display:none}
#ppt-gd.on{display:block}.gd{position:absolute;background:#ff3b30;opacity:.8}
.gd.h{height:1px;left:0;right:0}.gd.v{width:1px;top:0;bottom:0}
body.pe .pc{display:flex!important}.pc{display:none;gap:4px;position:absolute;top:8px;right:8px;z-index:50}
.pc button{background:rgba(28,28,30,.95);color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:-apple-system,sans-serif}
.pc button:hover{background:#ff6b35;color:#0a0a0a}.pc button.del:hover{background:#ff3b30;color:#fff}
body.pe #deck{transition:none!important}
body.pe .slide{padding-left:0!important;padding-right:0!important}
body.pe .canvas-card{margin-left:var(--hp-sb)!important;width:calc(100vw - var(--hp-sb) - var(--hp-in))!important}
#ppt-zm{position:fixed;left:calc(var(--hp-sb) + 20px);bottom:14px;z-index:9999;display:none;align-items:center;gap:4px;background:rgba(28,28,30,.98);border:1px solid #3a3a3c;border-radius:8px;padding:5px 8px;font-family:-apple-system,sans-serif}
body.pe #ppt-zm{display:flex}
#ppt-zm button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:3px;font-size:14px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center}
#ppt-zm button:hover{background:#ff6b35;color:#0a0a0a}
#ppt-zm .zv{color:#fff;font-size:12px;min-width:42px;text-align:center}
#ppt-to{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:10001;background:rgba(28,28,30,.98);color:#fff;border:1px solid #ff6b35;border-radius:8px;padding:10px 18px;font-size:13px;font-family:-apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .2s}
#ppt-to.on{opacity:1}`;
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:CSS}));

class PPTEditor{
  constructor(){this.m='view';this.z=1;this.d=0;this.undo=new UndoManager();this.dispose=[];this.sel=null;this.fn=''}
  start(){this._ui();this._bind();this._fn();return this}
  stop(){this._toggle(0);document.querySelectorAll('.pc,.dh').forEach(c=>c.remove());document.querySelectorAll('.ps,.pw').forEach(c=>c.classList.remove('ps','pw'));this.undo.clear();this.dispose.forEach(f=>f());this.dispose=[]}
  _ui(){
    if(document.getElementById('ppt-bar'))return;
    const bar=document.createElement('div');bar.id='ppt-bar';
    bar.innerHTML='<span style="color:#ff6b35;font-weight:700;font-size:11px">▶</span><button id="eb-t" class="pri">编辑</button><button id="eb-s" class="pri">💾 保存</button><span class="st" id="eb-st">已加载</span><span id="eb-fn" style="color:#888;font-size:11px;border-left:1px solid #333;padding-left:8px;margin-left:4px"></span><button id="eb-h">？</button>';
    document.body.appendChild(bar);
    [{id:'ppt-sb'},{id:'ppt-in',h:'<div class="ie">选中元素查看属性</div>'},{id:'ppt-gd'},{id:'ppt-zm',h:'<button id="zm-o">−</button><span class="zv" id="zm-v">100%</span><button id="zm-i">＋</button><button id="zm-f">⤢</button>'},{id:'ppt-to'}].forEach(d=>{const e=document.createElement('div');e.id=d.id;if(d.h)e.innerHTML=d.h;document.body.appendChild(e)})
  }
  _bind(){
    document.getElementById('eb-t').onclick=()=>this._toggle();
    document.getElementById('eb-s').onclick=()=>this._save();
    document.getElementById('eb-h').onclick=()=>toast('Cmd+S保存 · Cmd+Z撤销 · Esc取消',5000);
    [['zm-o',-0.1],['zm-i',0.1],['zm-f',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.onclick=()=>this._zoom(v?v:1)});
    const onKey=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();this._save()}
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)this.undo.redo();else ceUndo()||this.undo.undo()}
      if(e.key==='Escape'){this._clr();hideGuides()}};
    const onInput=e=>{if(e.target.getAttribute('contenteditable')==='true')this._md()};
    const onUnload=e=>{if(this.d){e.preventDefault();e.returnValue='未保存'}};
    document.addEventListener('keydown',onKey);
    document.addEventListener('input',onInput);
    window.addEventListener('beforeunload',onUnload);
    this.dispose.push(()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('input',onInput);window.removeEventListener('beforeunload',onUnload)});
  }
  _fn(){const p=new URLSearchParams(location.search);this.fn=p.get('file')||'';if(!this.fn)this.fn=(document.title||'未命名')+'.html';const el=document.getElementById('eb-fn');if(el)el.textContent=this.fn}
  _md(){this.d=1;const s=document.getElementById('eb-st');if(s){s.textContent='● 未保存';s.style.color='#ff6b35'}}
  _toggle(f){const on=typeof f==='boolean'?f:this.m!=='edit';this.m=on?'edit':'view';document.body.classList.toggle('pe',on);['ppt-sb','ppt-in'].forEach(id=>document.getElementById(id).classList.toggle('on',on));const btn=document.getElementById('eb-t');btn.textContent=on?'✓ 编辑':'编辑';btn.classList.toggle('pri',!on);if(on){this._me();this._sb();toast('点文字·点图拖拽缩放·右栏调属性',3500)}else{this._ue();hideGuides();this._clr();this._zoom(1)}}

  _me(){
    const T=['H1','H2','H3','H4','H5','H6','P','SPAN','LI','STRONG','B','EM'];
    const D=['lead','t-meta','t-cat','col-ttl','col-desc','col-tag','layer-ttl','layer-nb','layer-desc','layer-tag','l','r'];
    document.querySelectorAll('#deck > section.slide').forEach((s,i)=>{
      s.querySelectorAll('*').forEach(el=>{
        if(el.closest('#ppt-bar,#ppt-sb,#ppt-in,#nav')||el.classList.contains('dh')||el.classList.contains('pc'))return;
        const fc=(typeof el.className==='string'&&el.className.split()[0])||'';
        if(T.includes(el.tagName)||(el.tagName==='DIV'&&D.includes(fc))){
          const ht=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
          if(ht||el.children.length===0)el.setAttribute('contenteditable','true');
        }
      });
      s.querySelectorAll('img').forEach(img=>{
        const w=img.closest('.robot-shot,.scene-img,.thumb,.case-img,.hook-shot,.frame-img')||img.parentElement;
        if(!w.classList.contains('pw')){w.classList.add('pw');['tl','tr','bl','br'].forEach(c=>{const h=document.createElement('div');h.className='dh rs '+c;h.dataset.c=c;w.appendChild(h)});this._drag(w);w.addEventListener('mousedown',e=>{if(this.m!=='edit'||e.target.classList.contains('dh'))return;this._ins(w)},true)}
      });
      if(!s.querySelector('.pc')){const c=document.createElement('div');c.className='pc';c.innerHTML='<button>↑</button><button>↓</button><button class="del">✕</button>';s.style.position=getComputedStyle(s).position==='static'?'relative':s.style.position;s.appendChild(c);c.children[0].onclick=e=>{this._mv(i,-1);e.stopPropagation()};c.children[1].onclick=e=>{this._mv(i,1);e.stopPropagation()};c.lastChild.onclick=e=>{this._del(i);e.stopPropagation()}}
      s.addEventListener('focusin',e=>{if(this.m==='edit'&&e.target.getAttribute('contenteditable')==='true')this._ins(e.target)})
    })
  }
  _ue(){document.querySelectorAll('[contenteditable="true"]').forEach(e=>e.removeAttribute('contenteditable'));document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'))}
  _mv(i,d){const ss=[...document.querySelectorAll('#deck > section.slide')],j=i+d;if(j<0||j>=ss.length)return;const dk=document.getElementById('deck');if(d>0)dk.insertBefore(ss[i],ss[j].nextSibling);else dk.insertBefore(ss[i],ss[j]);this._rn();this._sb();go(j);this._md()}
  _del(i){const ss=document.querySelectorAll('#deck > section.slide');if(ss.length<=1)return;if(!confirm('删除?'))return;ss[i].remove();this._rn();this._sb();go(Math.max(0,i-1));this._md()}
  _rn(){const ss=document.querySelectorAll('#deck > section.slide');ss.forEach((s,i)=>{s.innerHTML=s.innerHTML.replace(/>\d{2} \/ \d{2}</,`>${String(i+1).padStart(2,'0')} / ${ss.length}<`)})}
  _zoom(v){this.z=Math.max(0.4,Math.min(2,v||this.z));document.querySelectorAll('#deck > section.slide').forEach(s=>s.style.zoom=this.z);const el=document.getElementById('zm-v');if(el)el.textContent=Math.round(this.z*100)+'%'}
  _sb(){const sb=document.getElementById('ppt-sb');sb.innerHTML='';document.querySelectorAll('#deck > section.slide').forEach((s,i)=>{const t=document.createElement('div');t.className='sb-t';t.innerHTML=`<div style="position:absolute;top:3px;left:5px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">${i+1}</div>`;t.onclick=()=>go(i);sb.appendChild(t)});this._sa();const o=window.go;if(o)window.go=n=>{o(n);this._sa()}}
  _sa(){const c=window.__currentSlideIndex||0;document.querySelectorAll('.sb-t').forEach((t,i)=>t.classList.toggle('on',i===c))}

  _drag(el){
    const Z=()=>this.z||1;let p=0,d=0,sx=0,sy=0,sl=0,st=0;
    const mm=e=>{if(!p)return;if(!d){if(Math.abs(e.clientX-sx)<4&&Math.abs(e.clientY-sy)<4)return;d=1;const r=el.getBoundingClientRect(),pr=el.parentElement.getBoundingClientRect(),zz=Z();if(getComputedStyle(el).position!=='absolute'){el.style.position='absolute';el.style.width=Math.round(r.width/zz)+'px';el.style.height=Math.round(r.height/zz)+'px';el.style.left=Math.round((r.left-pr.left)/zz)+'px';el.style.top=Math.round((r.top-pr.top)/zz)+'px';el.style.maxWidth='none';el.style.maxHeight='none'}sl=parseFloat(el.style.left)||0;st=parseFloat(el.style.top)||0}if(d){const zz=Z();el.style.left=(sl+(e.clientX-sx)/zz)+'px';el.style.top=(st+(e.clientY-sy)/zz)+'px';showGuides(el);this._md()}};
    const mu=()=>{p=0;hideGuides()};
    el.addEventListener('mousedown',e=>{if(this.m!=='edit'||e.target.classList.contains('dh'))return;p=1;d=0;sx=e.clientX;sy=e.clientY;e.preventDefault()});
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
    this.dispose.push(()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu)});
    el.querySelectorAll('.dh.rs').forEach(h=>{
      let rs=0,rx=0,ry=0,rw=0,rh=0,rl=0,rt=0;
      h.addEventListener('mousedown',e=>{if(this.m!=='edit')return;rs=1;rx=e.clientX;ry=e.clientY;const r=el.getBoundingClientRect(),pr=el.parentElement.getBoundingClientRect(),zz=Z();if(getComputedStyle(el).position!=='absolute'){el.style.position='absolute';el.style.width=Math.round(r.width/zz)+'px';el.style.height=Math.round(r.height/zz)+'px';el.style.left=Math.round((r.left-pr.left)/zz)+'px';el.style.top=Math.round((r.top-pr.top)/zz)+'px';el.style.maxWidth='none';el.style.maxHeight='none'}rw=r.width/zz;rh=r.height/zz;rl=parseFloat(el.style.left)||0;rt=parseFloat(el.style.top)||0;el.style.aspectRatio='auto';e.preventDefault();e.stopPropagation();const c=h.dataset.c,isL=c==='tl'||c==='bl',isT=c==='tl'||c==='tr';
        const rm=e=>{if(!rs)return;const zz=Z(),dx=(e.clientX-rx)/zz,dy=(e.clientY-ry)/zz;let s=(rw+(isL?-dx:dx))/rw;s=Math.max(0.25,Math.min(4,s));const nw=rw*s,nh=rh*s,nl=isL?rl-(nw-rw):rl,nt=isT?rt-(nh-rh):rt;el.style.width=Math.round(nw)+'px';el.style.height=Math.round(nh)+'px';el.style.left=Math.round(nl)+'px';el.style.top=Math.round(nt)+'px';this._md()};
        const ru=()=>{rs=0;document.removeEventListener('mousemove',rm);document.removeEventListener('mouseup',ru)};
        document.addEventListener('mousemove',rm);document.addEventListener('mouseup',ru);this.dispose.push(()=>{document.removeEventListener('mousemove',rm);document.removeEventListener('mouseup',ru)})
      })
    })
  }

  _ins(el){
    this.sel=el;document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'));el.classList.add('ps');
    const ins=document.getElementById('ppt-in');
    if(el.classList.contains('pw')){const img=el.querySelector('img'),cs=getComputedStyle(img),wcs=getComputedStyle(el),mh=parseInt(wcs.maxHeight)||0,mhVh=mh?Math.round(mh/window.innerHeight*100):0,r=Math.round(parseFloat(wcs.borderRadius))||0,bm=(cs.filter.match(/brightness\(([\d.]+)\)/)||[])[1],bPct=Math.round((bm||1)*100);
    ins.innerHTML=`<div class="is"><div class="ih">图片</div><div class="ir"><input type="text" id="iu" placeholder="URL" value="${img.src.startsWith('data:')?'':img.src}" style="width:100%"></div><div class="ir"><input type="file" id="if" accept="image/*" style="font-size:11px;width:100%"></div></div><div class="is"><div class="ih">尺寸</div><div class="ib">${['1 / 1','4 / 3','3 / 4','16 / 9'].map(v=>`<button class="ib btn" data-r="${v}">${v}</button>`).join('')}</div><div class="ir"><label>最大高 ${mhVh}vh</label><input type="range" id="im" min="0" max="55" value="${mhVh}"></div></div><div class="is"><div class="ih">样式</div><div class="ib"><button class="ib btn ${cs.objectFit==='cover'?'on':''}" data-f="cover">填满</button><button class="ib btn ${cs.objectFit==='contain'?'on':''}" data-f="contain">完整</button></div><div class="ir"><label>圆角 ${r}px</label><input type="range" id="ir" min="0" max="40" value="${r}"></div><div class="ir"><label>亮度 ${bPct}%</label><input type="range" id="ib" min="40" max="120" value="${bPct}"></div><div class="ir"><label>边框</label><input type="color" id="ic" value="${rgbHex(wcs.borderColor)}"></div></div><div class="is"><button class="ib btn" id="irr" style="width:100%">↺ 重置</button></div>`;
    document.getElementById('iu').onchange=e=>{if(e.target.value.trim()){img.src=e.target.value.trim();this._md()}};
    document.getElementById('if').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{img.src=r.result;this._md()};r.readAsDataURL(f)};
    ins.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{el.style.aspectRatio=b.dataset.r;el.style.height='auto';this._md()});
    document.getElementById('im').oninput=e=>{el.style.maxHeight=e.target.value+'vh';e.target.previousElementSibling.textContent='最大高 '+e.target.value+'vh';this._md()};
    ins.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ins.querySelectorAll('[data-f]').forEach(x=>x.classList.remove('on'));b.classList.add('on');img.style.objectFit=b.dataset.f;this._md()});
    document.getElementById('ir').oninput=e=>{el.style.borderRadius=e.target.value+'px';e.target.previousElementSibling.textContent='圆角 '+e.target.value+'px';this._md()};
    document.getElementById('ib').oninput=e=>{img.style.filter='brightness('+(e.target.value/100)+')';e.target.previousElementSibling.textContent='亮度 '+e.target.value+'%';this._md()};
    document.getElementById('ic').oninput=e=>{el.style.borderColor=e.target.value;this._md()};
    document.getElementById('irr').onclick=()=>{el.removeAttribute('style');img.removeAttribute('style');this._ins(el);this._md()}
    }else{
      const cs=getComputedStyle(el),fs=Math.round(parseFloat(cs.fontSize))||16,fw=cs.fontWeight,it=cs.fontStyle==='italic',al=cs.textAlign;
      ins.innerHTML=`<div class="is"><div class="ih">${el.tagName.toLowerCase()} · 文字</div><div class="ir"><label>字号</label><input type="number" id="ifs" value="${fs}" min="8" max="200"></div><div class="ir"><label>颜色</label><input type="color" id="ico" value="${rgbHex(cs.color)}"></div></div><div class="is"><div class="ih">样式</div><div class="ib"><button class="ib btn ${fw>=600?'on':''}" id="ibd" style="font-weight:700">B</button><button class="ib btn ${it?'on':''}" id="iit" style="font-style:italic">I</button></div></div><div class="is"><div class="ih">对齐</div><div class="ib">${['left','center','right'].map(v=>`<button class="ib btn ${al===v?'on':''}" data-al="${v}">${v==='left'?'左':v==='center'?'中':'右'}</button>`).join('')}</div></div>`;
      document.getElementById('ifs').oninput=e=>this._sty(el,'fontSize',e.target.value+'px');
      document.getElementById('ico').oninput=e=>this._sty(el,'color',e.target.value);
      document.getElementById('ibd').onclick=()=>{const v=el.style.fontWeight==='700'?'400':'700';this._sty(el,'fontWeight',v);document.getElementById('ibd').classList.toggle('on')};
      document.getElementById('iit').onclick=()=>{const v=el.style.fontStyle==='italic'?'normal':'italic';this._sty(el,'fontStyle',v);document.getElementById('iit').classList.toggle('on')};
      ins.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{ins.querySelectorAll('[data-al]').forEach(x=>x.classList.remove('on'));b.classList.add('on');this._sty(el,'textAlign',b.dataset.al)})
    }
  }
  _sty(el,p,val){const old=el.style[p];this.undo.push(el,p,old,val);el.style[p]=val;this._md()}
  _clr(){this.sel=null;document.querySelectorAll('.ps').forEach(e=>e.classList.remove('ps'));document.getElementById('ppt-in').innerHTML='<div class="ie">选中元素查看属性</div>'}

  async _save(){
    const was=this.m==='edit';if(was)this._toggle(0);
    document.querySelectorAll('.pc,.dh').forEach(c=>c.remove());
    document.querySelectorAll('.ps,.pw').forEach(c=>c.classList.remove('ps','pw'));
    document.querySelectorAll('#deck > section.slide').forEach(s=>s.style.zoom='');
    // 保存前隐藏编辑器 UI,避免污染文件
    const ui=['ppt-bar','ppt-sb','ppt-in','ppt-gd','ppt-zm','ppt-to'];
    ui.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none'});
    const html='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
    ui.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display=''});
    const st=document.getElementById('eb-st');st.textContent='保存中...';st.style.color='#888';
    try{const b=new URLSearchParams();b.append('html',html);b.append('file',this.fn);const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b.toString()});const d=await r.json();if(d.ok){this.d=0;st.textContent='已保存';st.style.color='#52c41a';toast('✓ 已保存');if(d.name)this.fn=d.name}else{st.textContent='失败';st.style.color='#ff6b6b'}}catch(e){st.textContent='出错';st.style.color='#ff6b6b'}
    if(was)setTimeout(()=>this._toggle(1),200)
  }
}
window.__pptEditor=new PPTEditor().start();
})();
