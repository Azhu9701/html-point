/* ============================================================
   PPT 编辑器 · Keynote 风格
   左侧幻灯片导航 + 右侧 Inspector + 选中即编辑 + 对齐参考线
   ============================================================ */
(function(){
  'use strict';
  if(window.__PPT_EDITOR_LOADED__) return;
  window.__PPT_EDITOR_LOADED__ = true;

  let editMode = false;
  let selectedEl = null;   // 当前选中元素

  /* ---------- 注入样式 ---------- */
  const css = `
  /* 顶部工具栏 */
  #ppt-editor-bar{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;align-items:center;background:rgba(28,28,30,.98);backdrop-filter:blur(16px);border:1px solid #3a3a3c;border-radius:12px;padding:6px 10px;box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:-apple-system,"PingFang SC",sans-serif;font-size:13px;max-width:94vw;flex-wrap:wrap;justify-content:center}
  #ppt-editor-bar .eb-title{color:#ff6b35;font-weight:700;font-size:11px;letter-spacing:.08em;padding:0 8px 0 4px}
  #ppt-editor-bar button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:6px;padding:6px 11px;font-size:12px;cursor:pointer;transition:all .12s;font-family:inherit;white-space:nowrap}
  #ppt-editor-bar button:hover{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35}
  #ppt-editor-bar button.primary{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35;font-weight:600}
  #ppt-editor-bar button.icon{padding:6px 8px;font-size:14px}
  #ppt-editor-bar .sep{width:1px;height:20px;background:#3a3a3c;margin:0 3px}
  #ppt-editor-bar .save-status{font-size:11px;color:#888;margin-left:2px;min-width:50px}

  /* 左侧幻灯片导航 (Keynote 左栏) */
  #ppt-sidebar{position:fixed;left:0;top:0;bottom:0;width:170px;background:rgba(20,20,22,.98);backdrop-filter:blur(16px);border-right:1px solid #2c2c2e;z-index:9998;overflow-y:auto;padding:52px 8px 12px;display:none}
  #ppt-sidebar.show{display:block}
  .sb-thumb{position:relative;width:100%;aspect-ratio:16/9;background:#0a0a0a;border:2px solid transparent;border-radius:6px;overflow:hidden;margin-bottom:8px;cursor:pointer;transition:border-color .12s}
  .sb-thumb:hover{border-color:#5a5a5a}
  .sb-thumb.active{border-color:#ff6b35}
  .sb-thumb .sb-clone{position:absolute;top:0;left:0;width:1600px;transform-origin:top left;pointer-events:none}
  .sb-thumb .sb-num{position:absolute;top:3px;left:5px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;font-family:-apple-system,sans-serif}
  .sb-thumb.drag-over{border-color:#00d4ff;border-style:dashed}

  /* 右侧 Inspector 检查器 (Keynote 右栏) */
  #ppt-inspector{position:fixed;right:0;top:0;bottom:0;width:250px;background:rgba(28,28,30,.98);backdrop-filter:blur(16px);border-left:1px solid #3a3a3c;z-index:9998;overflow-y:auto;padding:52px 14px 14px;display:none;font-family:-apple-system,"PingFang SC",sans-serif}
  #ppt-inspector.show{display:block}
  #ppt-inspector .ins-empty{color:#666;font-size:12px;text-align:center;margin-top:40px}
  .ins-section{border-bottom:1px solid #2c2c2e;padding:12px 0}
  .ins-section:last-child{border-bottom:0}
  .ins-section .ins-h{color:#ff6b35;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
  .ins-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:12px;color:#bbb}
  .ins-row label{flex-shrink:0}
  .ins-row input[type="number"],.ins-row input[type="text"],.ins-row select{background:#1c1c1e;color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:4px 6px;font-size:12px;width:70px;font-family:inherit}
  .ins-row input[type="range"]{flex:1;margin-left:8px;max-width:110px}
  .ins-row input[type="color"]{width:32px;height:26px;border:1px solid #3a3a3c;border-radius:5px;background:#1c1c1e;cursor:pointer;padding:2px}
  .ins-btns{display:flex;gap:4px;flex-wrap:wrap}
  .ins-btn{background:#2c2c2e;color:#ccc;border:1px solid #3a3a3c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:inherit}
  .ins-btn:hover,.ins-btn.active{background:#ff6b35;color:#0a0a0a;border-color:#ff6b35}
  .ins-btn.active{font-weight:600}

  /* 选中状态: 用 box-shadow 代替 outline, 绝不影响布局 */
  .ppt-selected{box-shadow:0 0 0 2px #00d4ff!important}
  body.ppt-editing [contenteditable="true"]:hover{box-shadow:0 0 0 1px rgba(255,107,53,.5)}
  body.ppt-editing [contenteditable="true"]:focus{box-shadow:0 0 0 2px #ff6b35!important;background:rgba(255,107,53,.04)}
  body.ppt-editing [contenteditable="true"]{cursor:text;outline:none!important}

  /* 图片选中 + 拖拽 */
  body.ppt-editing .ppt-img-wrap{cursor:move;position:relative;user-select:none;-webkit-user-select:none}
  body.ppt-editing .ppt-img-wrap img{-webkit-user-drag:none;user-select:none;pointer-events:none}
  body.ppt-editing .ppt-img-wrap:hover{box-shadow:0 0 0 2px #ff6b35}
  body.ppt-editing .ppt-img-wrap.ppt-selected{box-shadow:0 0 0 2px #00d4ff!important}
  .ppt-drag-handle{position:absolute;display:none;z-index:40;pointer-events:auto}
  body.ppt-editing .ppt-img-wrap.ppt-selected .ppt-drag-handle{display:flex}
  .ppt-drag-handle.resize{width:14px;height:14px;background:#00d4ff;border:2px solid #fff;border-radius:3px;position:absolute;z-index:41}
  .ppt-drag-handle.resize.tl{top:-7px;left:-7px;cursor:nwse-resize}
  .ppt-drag-handle.resize.tr{top:-7px;right:-7px;cursor:nesw-resize}
  .ppt-drag-handle.resize.bl{bottom:-7px;left:-7px;cursor:nesw-resize}
  .ppt-drag-handle.resize.br{bottom:-7px;right:-7px;cursor:nwse-resize}

  /* 对齐参考线 (红色) */
  #ppt-guides{position:fixed;inset:0;pointer-events:none;z-index:9997;display:none}
  #ppt-guides.show{display:block}
  .ppt-guide{position:absolute;background:#ff3b30;opacity:.8}
  .ppt-guide.h{height:1px;left:0;right:0}
  .ppt-guide.v{width:1px;top:0;bottom:0}

  /* 页面控制 */
  body.ppt-editing .ppt-page-controls{display:flex!important}
  .ppt-page-controls{display:none;gap:4px;position:absolute;top:8px;right:8px;z-index:50}
  .ppt-page-controls button{background:rgba(28,28,30,.95);color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:-apple-system,sans-serif;line-height:1.2}
  .ppt-page-controls button:hover{background:#ff6b35;color:#0a0a0a}
  .ppt-page-controls button.del:hover{background:#ff3b30;color:#fff}

  /* 编辑模式: 侧栏不透明 + canvas-card 宽度收缩到两侧栏之间 */
  body.ppt-editing #deck{transition:none!important}
  #ppt-sidebar{background:#141416!important}
  #ppt-inspector{background:#1c1c1e!important}
  /* 去除 slide 外层 padding, 让 canvas-card margIn 从 viewport 边缘算起 */
  body.ppt-editing .slide{padding-left:0!important;padding-right:0!important}
  /* canvas-card 左移 170px + 宽度 = 100vw - 420px = 正好嵌在侧栏之间 */
  body.ppt-editing .canvas-card{margin-left:170px!important;width:calc(100vw - 420px)!important}

  /* 页面缩放 */
  #ppt-zoom-bar{position:fixed;left:190px;bottom:14px;z-index:9999;display:none;align-items:center;gap:4px;background:rgba(28,28,30,.98);backdrop-filter:blur(16px);border:1px solid #3a3a3c;border-radius:8px;padding:5px 8px;font-family:-apple-system,sans-serif}
  body.ppt-editing #ppt-zoom-bar{display:flex}
  #ppt-zoom-bar button{background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:5px;padding:3px 8px;font-size:14px;cursor:pointer;line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center}
  #ppt-zoom-bar button:hover{background:#ff6b35;color:#0a0a0a}
  #ppt-zoom-bar .zm-val{color:#fff;font-size:12px;min-width:42px;text-align:center}
  /* 缩放时 deck 用 transform-origin 左上, 配合 transform 翻页 */
  body.ppt-zooming .slide{transform-origin:top left}

  /* Toast */
  #ppt-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:10001;background:rgba(28,28,30,.98);color:#fff;border:1px solid #ff6b35;border-radius:8px;padding:10px 18px;font-size:13px;font-family:-apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .2s}
  #ppt-toast.show{opacity:1}
  `;
  const styleEl=document.createElement('style');styleEl.textContent=css;document.head.appendChild(styleEl);

  function $(id){return document.getElementById(id);}
  function toast(msg,ms=2000){const t=$('ppt-toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),ms);}

  /* ============================================================
     构建 UI: 顶栏 + 左导航 + 右检查器 + 参考线 + Toast
     ============================================================ */
  function buildUI(){
    if($('ppt-editor-bar'))return;

    // 顶栏
    const bar=document.createElement('div');bar.id='ppt-editor-bar';
    bar.innerHTML=`
      <span class="eb-title">▶</span>
      <button id="eb-toggle" class="primary">编辑</button>
      <div class="sep"></div>
      <button id="eb-add-page" class="icon" title="新增页">＋</button>
      <button id="eb-dup-page" class="icon" title="复制页">⧉</button>
      <button id="eb-del-page" class="icon" title="删除页">🗑</button>
      <div class="sep"></div>
      <button id="eb-save" class="primary">💾 保存</button>
      <span class="save-status" id="eb-status">已加载</span>
      <span class="eb-title" id="eb-filename" style="border-left:1px solid #333;padding-left:8px;margin-left:4px;font-size:11px"></span>
      <button id="eb-help" class="icon" title="帮助">？</button>`;
    document.body.appendChild(bar);

    // 左侧导航
    const sb=document.createElement('div');sb.id='ppt-sidebar';
    document.body.appendChild(sb);

    // 右侧检查器
    const ins=document.createElement('div');ins.id='ppt-inspector';
    ins.innerHTML='<div class="ins-empty">选中元素查看属性<br><br>点文字编辑 · 点图片拖动缩放</div>';
    document.body.appendChild(ins);

    // 对齐参考线层
    const gd=document.createElement('div');gd.id='ppt-guides';
    document.body.appendChild(gd);

    // 缩放条
    const zb=document.createElement('div');zb.id='ppt-zoom-bar';
    zb.innerHTML=`<button id="zm-out" title="缩小">−</button><span class="zm-val" id="zm-val">100%</span><button id="zm-in" title="放大">＋</button><button id="zm-fit" title="适应">⤢</button>`;
    document.body.appendChild(zb);

    // Toast
    const t=document.createElement('div');t.id='ppt-toast';document.body.appendChild(t);
  }

  /* ---------- 页面缩放 ---------- */
  let zoomLevel=1;
  function applyZoom(z){
    zoomLevel=Math.max(0.4,Math.min(2,z));
    document.body.classList.toggle('ppt-zooming',zoomLevel!==1);
    // 缩放每个 slide (不影响翻页 transform, 用 CSS 变量叠加)
    document.documentElement.style.setProperty('--ppt-zoom',zoomLevel);
    document.querySelectorAll('#deck > section.slide').forEach(s=>{
      s.style.zoom=(zoomLevel);  // zoom 属性简单可靠, 不干扰 transform
    });
    const v=$('zm-val');if(v)v.textContent=Math.round(zoomLevel*100)+'%';
  }
  function setupZoom(){
    $('zm-out').onclick=()=>applyZoom(zoomLevel-0.1);
    $('zm-in').onclick=()=>applyZoom(zoomLevel+0.1);
    $('zm-fit').onclick=()=>applyZoom(1);
  }

  /* ============================================================
     1. 左侧幻灯片导航
     ============================================================ */
  function buildSidebar(){
    const sb=$('ppt-sidebar');sb.innerHTML='';
    const slides=[...document.querySelectorAll('#deck > section.slide')];
    slides.forEach((slide,i)=>{
      const thumb=document.createElement('div');thumb.className='sb-thumb';thumb.dataset.i=i;
      // 缩略图: 克隆当前 slide 缩放
      const clone=slide.cloneNode(true);
      clone.className=slide.className+' sb-clone';
      clone.style.cssText='width:1600px;height:900px;transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none;opacity:1';
      thumb.appendChild(clone);
      const num=document.createElement('div');num.className='sb-num';num.textContent=(i+1);
      thumb.appendChild(num);

      // 缩放克隆体到缩略图大小
      requestAnimationFrame(()=>{
        const w=thumb.clientWidth;
        const scale=w/1600;
        clone.style.transform='scale('+scale+')';
      });

      thumb.onclick=()=>go(i);
      // 拖拽排序
      thumb.draggable=true;
      thumb.ondragstart=e=>{e.dataTransfer.setData('text/plain',i);};
      thumb.ondragover=e=>{e.preventDefault();thumb.classList.add('drag-over');};
      thumb.ondragleave=()=>thumb.classList.remove('drag-over');
      thumb.ondrop=e=>{
        e.preventDefault();thumb.classList.remove('drag-over');
        const from=+e.dataTransfer.getData('text/plain');
        const to=i;
        if(from===to)return;
        const deck=$('deck');
        const all=[...document.querySelectorAll('#deck > section.slide')];
        if(from<to)deck.insertBefore(all[from],all[to].nextSibling);
        else deck.insertBefore(all[from],all[to]);
        renumber();rebuildSidebar();markDirty();
      };
      sb.appendChild(thumb);
    });
    // 高亮当前
    updateSidebarActive();
  }
  function updateSidebarActive(){
    const cur=window.__currentSlideIndex||0;
    document.querySelectorAll('.sb-thumb').forEach((t,i)=>t.classList.toggle('active',i===cur));
  }
  function rebuildSidebar(){buildSidebar();}

  /* ============================================================
     2. 右侧 Inspector 检查器 (选中元素实时显示属性)
     ============================================================ */
  function showInspector(el){
    selectedEl=el;
    // 清除旧选中
    document.querySelectorAll('.ppt-selected').forEach(e=>e.classList.remove('ppt-selected'));
    el.classList.add('ppt-selected');
    const ins=$('ppt-inspector');
    const isImg=el.classList.contains('ppt-img-wrap');
    if(isImg){
      ins.innerHTML=buildImgInspector(el);
      bindImgInspector(el);
    }else{
      ins.innerHTML=buildTextInspector(el);
      bindTextInspector(el);
    }
  }
  function clearInspector(){
    selectedEl=null;
    document.querySelectorAll('.ppt-selected').forEach(e=>e.classList.remove('ppt-selected'));
    const ins=$('ppt-inspector');
    if(ins)ins.innerHTML='<div class="ins-empty">选中元素查看属性</div>';
  }

  function buildTextInspector(el){
    const cs=getComputedStyle(el);
    const fs=Math.round(parseFloat(cs.fontSize))||16;
    const fw=cs.fontWeight;
    const italic=cs.fontStyle==='italic';
    const align=cs.textAlign;
    const color=rgbToHex(cs.color);
    const tag=el.tagName.toLowerCase();
    return `
    <div class="ins-section">
      <div class="ins-h">${tag} · 文字</div>
      <div class="ins-row"><label>字号</label><input type="number" id="in-fs" value="${fs}" min="8" max="200"></div>
      <div class="ins-row"><label>颜色</label><input type="color" id="in-color" value="${color}"></div>
    </div>
    <div class="ins-section">
      <div class="ins-h">字重/样式</div>
      <div class="ins-btns">
        <button class="ins-btn ${fw>=600?'active':''}" id="in-bold" style="font-weight:700">B</button>
        <button class="ins-btn ${italic?'active':''}" id="in-italic" style="font-style:italic">I</button>
      </div>
    </div>
    <div class="ins-section">
      <div class="ins-h">对齐</div>
      <div class="ins-btns">
        <button class="ins-btn ${align==='left'?'active':''}" data-align="left">左</button>
        <button class="ins-btn ${align==='center'?'active':''}" data-align="center">中</button>
        <button class="ins-btn ${align==='right'?'active':''}" data-align="right">右</button>
      </div>
    </div>
    <div class="ins-section">
      <div class="ins-h">间距</div>
      <div class="ins-row"><label>行高</label><input type="text" id="in-lh" value="${cs.lineHeight}"></div>
      <div class="ins-row"><label>字距</label><input type="text" id="in-ls" value="${cs.letterSpacing}"></div>
    </div>`;
  }
  function bindTextInspector(el){
    const apply=(prop,val)=>{el.style[prop]=val;markDirty();};
    const inFs=$('in-fs');if(inFs)inFs.oninput=e=>apply('fontSize',e.target.value+'px');
    const inColor=$('in-color');if(inColor)inColor.oninput=e=>apply('color',e.target.value);
    const inBold=$('in-bold');if(inBold)inBold.onclick=()=>{
      const isAct=inBold.classList.toggle('active');
      apply('fontWeight',isAct?'700':'400');
    };
    const inItalic=$('in-italic');if(inItalic)inItalic.onclick=()=>{
      const isAct=inItalic.classList.toggle('active');
      apply('fontStyle',isAct?'italic':'normal');
    };
    document.querySelectorAll('#ppt-inspector [data-align]').forEach(b=>{
      b.onclick=()=>{
        document.querySelectorAll('#ppt-inspector [data-align]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        apply('textAlign',b.dataset.align);
      };
    });
    const inLh=$('in-lh');if(inLh)inLh.oninput=e=>apply('lineHeight',e.target.value);
    const inLs=$('in-ls');if(inLs)inLs.oninput=e=>apply('letterSpacing',e.target.value);
  }

  function buildImgInspector(el){
    const cs=getComputedStyle(el);
    const img=el.querySelector('img');
    const is=getComputedStyle(img);
    const mh=parseInt(cs.maxHeight)||0;
    const mhVh=mh?Math.round(mh/window.innerHeight*100):0;
    const r=Math.round(parseFloat(cs.borderRadius))||0;
    const bm=(is.filter.match(/brightness\(([\d.]+)\)/)||[])[1];
    const bPct=Math.round((bm||1)*100);
    return `
    <div class="ins-section">
      <div class="ins-h">图片 · 换图源</div>
      <div class="ins-row"><input type="text" id="in-img-url" placeholder="图片URL" value="${img.src.startsWith('data:')?'':img.src}" style="width:100%"></div>
      <div class="ins-row"><input type="file" id="in-img-file" accept="image/*" style="font-size:11px;color:#888;width:100%"></div>
    </div>
    <div class="ins-section">
      <div class="ins-h">尺寸</div>
      <div class="ins-row"><label>宽高比</label></div>
      <div class="ins-btns">
        <button class="ins-btn" data-ratio="1 / 1">1:1</button>
        <button class="ins-btn" data-ratio="4 / 3">4:3</button>
        <button class="ins-btn" data-ratio="3 / 4">3:4</button>
        <button class="ins-btn" data-ratio="16 / 9">16:9</button>
      </div>
      <div class="ins-row" style="margin-top:8px"><label>最大高 ${mhVh}vh</label><input type="range" id="in-mh" min="0" max="55" value="${mhVh}"></div>
    </div>
    <div class="ins-section">
      <div class="ins-h">缩放/样式</div>
      <div class="ins-row"><label>方式</label></div>
      <div class="ins-btns">
        <button class="ins-btn ${is.objectFit==='cover'?'active':''}" data-fit="cover">填满</button>
        <button class="ins-btn ${is.objectFit==='contain'?'active':''}" data-fit="contain">完整</button>
      </div>
      <div class="ins-row" style="margin-top:8px"><label>圆角 ${r}px</label><input type="range" id="in-radius" min="0" max="40" value="${r}"></div>
      <div class="ins-row"><label>亮度 ${bPct}%</label><input type="range" id="in-bright" min="40" max="120" value="${bPct}"></div>
      <div class="ins-row"><label>边框</label><input type="color" id="in-border" value="${rgbToHex(cs.borderColor)}"></div>
    </div>
    <div class="ins-section">
      <button class="ins-btn" id="in-reset" style="width:100%">↺ 重置该图样式</button>
    </div>`;
  }
  function bindImgInspector(wrap){
    const img=wrap.querySelector('img');
    const apply=(target,prop,val)=>{target.style[prop]=val;markDirty();};
    const urlIn=$('in-img-url');
    if(urlIn)urlIn.onchange=e=>{if(e.target.value.trim())img.src=e.target.value.trim();markDirty();};
    const fileIn=$('in-img-file');
    if(fileIn)fileIn.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{img.src=r.result;markDirty();};r.readAsDataURL(f);};
    document.querySelectorAll('#ppt-inspector [data-ratio]').forEach(b=>{
      b.onclick=()=>{wrap.style.aspectRatio=b.dataset.ratio;wrap.style.height='auto';markDirty();};
    });
    const mhIn=$('in-mh');
    if(mhIn)mhIn.oninput=e=>{wrap.style.maxHeight=e.target.value+'vh';e.target.previousElementSibling.textContent='最大高 '+e.target.value+'vh';markDirty();};
    document.querySelectorAll('#ppt-inspector [data-fit]').forEach(b=>{
      b.onclick=()=>{document.querySelectorAll('#ppt-inspector [data-fit]').forEach(x=>x.classList.remove('active'));b.classList.add('active');apply(img,'objectFit',b.dataset.fit);};
    });
    const rIn=$('in-radius');
    if(rIn)rIn.oninput=e=>{wrap.style.borderRadius=e.target.value+'px';e.target.previousElementSibling.textContent='圆角 '+e.target.value+'px';markDirty();};
    const bIn=$('in-bright');
    if(bIn)bIn.oninput=e=>{img.style.filter='brightness('+(e.target.value/100)+')';e.target.previousElementSibling.textContent='亮度 '+e.target.value+'%';markDirty();};
    const bdIn=$('in-border');
    if(bdIn)bdIn.oninput=e=>apply(wrap,'borderColor',e.target.value);
    const rs=$('in-reset');
    if(rs)rs.onclick=()=>{wrap.removeAttribute('style');img.removeAttribute('style');showInspector(wrap);markDirty();toast('已重置');};
  }

  function rgbToHex(c){if(!c)return'#ffffff';if(c.startsWith('#'))return c.length===4?'#'+c.slice(1).split('').map(x=>x+x).join(''):c.slice(0,7);const m=c.match(/\d+/g);if(!m)return'#ffffff';return'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');}

  /* ============================================================
     3. 编辑模式: 标记可编辑 + 绑定选中
     ============================================================ */
  function markEditable(){
    document.querySelectorAll('#deck > section.slide').forEach((slide,i)=>{
      // ---- 文字: 白名单排除法 ----
      const TEXT_TAGS=['H1','H2','H3','H4','H5','H6','P','SPAN','LI','STRONG','B','EM'];
      const EDITABLE_DIV=['lead','t-meta','t-cat','col-ttl','col-desc','col-tag','layer-ttl','layer-nb','layer-desc','layer-tag','l','r','multi','nb','yr','desc','ttl','note','lbl','unit','stat-label','stat-note','step-nb','step-title','step-desc','bar-label','bar-value','row-lbl','row-val'];
      slide.querySelectorAll('*').forEach(el=>{
        if(el.closest('#ppt-editor-bar,#ppt-sidebar,#ppt-inspector,#ppt-guides,#nav,.ppt-page-controls'))return;
        const tag=el.tagName;
        const cls=el.className||'';
        const firstCls=(typeof cls==='string'&&cls.split()[0])||'';
        if(TEXT_TAGS.includes(tag)){
          const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
          const onlyBr=[...el.children].every(c=>c.tagName==='BR');
          if(hasText||el.children.length===0||onlyBr)el.setAttribute('contenteditable','true');
        }else if(tag==='DIV'&&EDITABLE_DIV.includes(firstCls)){
          const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
          const onlyBr=[...el.children].every(c=>c.tagName==='BR');
          if(hasText||el.children.length===0||onlyBr)el.setAttribute('contenteditable','true');
        }
      });
      slide.querySelectorAll('.kpi-cell .nb,.tl-node .multi,.tl-node .yr,.stat-nb,.bar-row .bar-value,.kpi-thin,.bar-tower .nb').forEach(el=>el.setAttribute('contenteditable','true'));

      // ---- 图片: 加拖拽 + 点击选中 ----
      slide.querySelectorAll('img').forEach(img=>{
        const wrap=img.closest('.robot-shot,.scene-img,.thumb,.case-img,.hook-shot,.frame-img')||img.parentElement;
        // 首次初始化: 创建手柄 → 绑定事件(手柄已存在)
        if(!wrap.classList.contains('ppt-img-wrap')){
          wrap.classList.add('ppt-img-wrap');
          // 先创建四角缩放手柄
          ['tl','tr','bl','br'].forEach(corner=>{
            const h=document.createElement('div');h.className='ppt-drag-handle resize '+corner;h.dataset.corner=corner;
            wrap.appendChild(h);
          });
          // 然后绑定拖拽+缩放(此时手柄已存在,querySelectorAll 能查到)
          enableDrag(wrap);
          // 选中 (单击) — 捕获阶段, 在手柄上直接跳过
          wrap.addEventListener('mousedown',e=>{
            if(!editMode)return;
            if(e.target.classList.contains('ppt-drag-handle'))return;
            showInspector(wrap);
          },true);
        }
      });

      // 文字选中: focus 时显示 inspector
      slide.addEventListener('focusin',e=>{
        if(editMode&&e.target.getAttribute('contenteditable')==='true'){
          showInspector(e.target);
        }
      });

      // 页面控制按钮
      if(!slide.querySelector('.ppt-page-controls')){
        const ctrl=document.createElement('div');ctrl.className='ppt-page-controls';
        ctrl.innerHTML=`<button class="mv-up" title="上移">↑</button><button class="mv-down" title="下移">↓</button><button class="del" title="删除">✕</button>`;
        if(getComputedStyle(slide).position==='static')slide.style.position='relative';
        slide.appendChild(ctrl);
        ctrl.querySelector('.mv-up').onclick=e=>{e.stopPropagation();moveSlide(i,-1);};
        ctrl.querySelector('.mv-down').onclick=e=>{e.stopPropagation();moveSlide(i,1);};
        ctrl.querySelector('.del').onclick=e=>{e.stopPropagation();delSlide(i);};
      }
    });
  }
  function unmarkEditable(){
    document.querySelectorAll('[contenteditable="true"]').forEach(el=>el.removeAttribute('contenteditable'));
    document.querySelectorAll('.ppt-selected').forEach(e=>e.classList.remove('ppt-selected'));
  }

  /* ============================================================
     4. 拖拽移动 + 缩放 + 对齐参考线
     ============================================================ */
  function enableDrag(el){
    let pending=false,dragging=false,sx=0,sy=0,sl=0,st=0,converted=false;
    el.addEventListener('mousedown',e=>{
      if(!editMode)return;
      if(e.target.classList.contains('ppt-drag-handle'))return; // 缩放手柄单独处理
      pending=true;dragging=false;converted=false;
      sx=e.clientX;sy=e.clientY;
      e.preventDefault();
      const onMove=ev=>{
        if(!pending)return;
        // 首次移动超过 4px 才真正开始拖拽 (避免误触), 此时才转 absolute
        if(!dragging){
          const dx=ev.clientX-sx,dy=ev.clientY-sy;
          if(Math.abs(dx)<4&&Math.abs(dy)<4)return;
          dragging=true;
          // 此时才转换定位 (记录原始信息以便恢复)
          const rect=el.getBoundingClientRect();
          const parentRect=el.parentElement.getBoundingClientRect();
          const z=zoomLevel||1;  // 纠正 CSS zoom 导致的坐标偏差
          if(getComputedStyle(el).position!=='absolute'){
            converted=true;
            el.__origPos=el.style.position;
            el.__origWidth=el.style.width;
            el.__origHeight=el.style.height;
            el.__origMaxW=el.style.maxWidth;
            el.__origMaxH=el.style.maxHeight;
            el.style.position='absolute';
            el.style.width=Math.round(rect.width/z)+'px';
            el.style.height=Math.round(rect.height/z)+'px';
            el.style.left=Math.round((rect.left-parentRect.left)/z)+'px';
            el.style.top=Math.round((rect.top-parentRect.top)/z)+'px';
            el.style.maxWidth='none';el.style.maxHeight='none';
          }
          sl=parseFloat(el.style.left)||0;st=parseFloat(el.style.top)||0;
        }
        if(dragging){
          const z=zoomLevel||1;
          let nl=sl+(ev.clientX-sx)/z,nt=st+(ev.clientY-sy)/z;
          el.style.left=nl+'px';el.style.top=nt+'px';
          showAlignGuides(el,nl,nt);
          markDirty();
        }
      };
      const onUp=()=>{
        pending=false;
        // 如果没真正拖动 (converted=false), 不破坏布局
        hideGuides();
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });

    // 四角缩放手柄
    el.querySelectorAll('.ppt-drag-handle.resize').forEach(handle=>{
      const corner=handle.dataset.corner;
      let rs=false,rx=0,ry=0,rw=0,rh0=0,rl=0,rt=0;
      handle.addEventListener('mousedown',e=>{
        if(!editMode)return;
        rs=true;rx=e.clientX;ry=e.clientY;
        const rect=el.getBoundingClientRect();
        const parentRect=el.parentElement.getBoundingClientRect();
        const z=zoomLevel||1;  // 纠正 CSS zoom
        // 先确保元素是绝对定位 (和拖拽移动一致的转换), 否则 left/top 读不到
        if(getComputedStyle(el).position!=='absolute'){
          el.style.position='absolute';
          el.style.width=Math.round(rect.width/z)+'px';
          el.style.height=Math.round(rect.height/z)+'px';
          el.style.left=Math.round((rect.left-parentRect.left)/z)+'px';
          el.style.top=Math.round((rect.top-parentRect.top)/z)+'px';
          el.style.maxWidth='none';el.style.maxHeight='none';
        }
        rw=rect.width/z;rh0=rect.height/z;
        rl=parseFloat(el.style.left)||0;rt=parseFloat(el.style.top)||0;
        el.style.aspectRatio='auto';
        e.preventDefault();e.stopPropagation();
        const onMove=ev=>{
          if(!rs)return;
          const z=zoomLevel||1;
          const dx=(ev.clientX-rx)/z,dy=(ev.clientY-ry)/z;
          let nw=rw,nh=rh0,nl=rl,nt=rt;
          // 等比缩放: 以对角为锚点, 当前角拖动距离按比例换算
          const isLeft=(corner==='tl'||corner==='bl');
          const isTop=(corner==='tl'||corner==='tr');
          let scale=(rw+ (isLeft? -dx:dx))/rw;
          scale=Math.max(0.25,Math.min(4,scale));
          nw=rw*scale;nh=rh0*scale;
          // 左/上角的角拖动时, 锚点是对角, 需平移 left/top
          if(isLeft)nl=rl-(nw-rw);
          if(isTop)nt=rt-(nh-rh0);
          el.style.width=Math.round(nw)+'px';
          el.style.height=Math.round(nh)+'px';
          el.style.left=Math.round(nl)+'px';
          el.style.top=Math.round(nt)+'px';
          markDirty();
        };
        const onUp=()=>{rs=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
    });
  }

  function showAlignGuides(el,left,top){
    const gd=$('ppt-guides');if(!gd)return;gd.classList.add('show');gd.innerHTML='';
    const slide=el.closest('section.slide');
    if(!slide)return;
    const sRect=slide.getBoundingClientRect();
    const eRect=el.getBoundingClientRect();
    const elCx=eRect.left+eRect.width/2;
    const elCy=eRect.top+eRect.height/2;
    const sCx=sRect.left+sRect.width/2;
    const sCy=sRect.top+sRect.height/2;
    // 垂直中线对齐
    if(Math.abs(elCx-sCx)<6){
      const v=document.createElement('div');v.className='ppt-guide v';v.style.left=sCx+'px';gd.appendChild(v);
      el.style.left=(sRect.width/2-eRect.width/2)+'px';
    }
    // 水平中线对齐
    if(Math.abs(elCy-sCy)<6){
      const h=document.createElement('div');h.className='ppt-guide h';h.style.top=sCy+'px';gd.appendChild(h);
      el.style.top=(sRect.height/2-eRect.height/2)+'px';
    }
  }
  function hideGuides(){const gd=$('ppt-guides');if(gd){gd.classList.remove('show');gd.innerHTML='';}}

  /* ============================================================
     页面操作
     ============================================================ */
  function moveSlide(idx,dir){
    const slides=[...document.querySelectorAll('#deck > section.slide')];const j=idx+dir;
    if(j<0||j>=slides.length){toast('已在边界');return;}
    const deck=$('deck');
    if(dir>0)deck.insertBefore(slides[idx],slides[j].nextSibling);else deck.insertBefore(slides[idx],slides[j]);
    renumber();rebuildSidebar();go(j);markDirty();
  }
  function delSlide(idx){
    const slides=document.querySelectorAll('#deck > section.slide');
    if(slides.length<=1){toast('至少留 1 页');return;}
    if(!confirm('删除第 '+(idx+1)+' 页？'))return;
    slides[idx].remove();renumber();rebuildSidebar();go(Math.max(0,idx-1));markDirty();
  }
  function addPage(){
    const slides=document.querySelectorAll('#deck > section.slide');
    const cur=slides[window.__currentSlideIndex||0];if(!cur)return;
    const blank=cur.cloneNode(true);
    blank.querySelectorAll('[contenteditable]').forEach(el=>{if(el.children.length===0)el.textContent='新内容';});
    blank.querySelectorAll('.ppt-page-controls,.ppt-drag-handle,.ppt-selected').forEach(c=>{c.remove();c.classList&&c.classList.remove('ppt-selected');});
    cur.after(blank);renumber();rebuildSidebar();go((window.__currentSlideIndex||0)+1);if(editMode)markEditable();markDirty();
  }
  function renumber(){
    const slides=document.querySelectorAll('#deck > section.slide');const total=slides.length;
    slides.forEach((s,i)=>{s.innerHTML=s.innerHTML.replace(/>\d{2} \/ \d{2}</,`>${String(i+1).padStart(2,'0')} / ${total}<`);});
  }

  /* ============================================================
     保存
     ============================================================ */
  let dirty=false;
  let currentFileName='';
  function markDirty(){dirty=true;const s=$('eb-status');if(s){s.textContent='● 未保存';s.style.color='#ff6b35';}}
  function clearDirty(){dirty=false;const s=$('eb-status');if(s){s.textContent='已保存';s.style.color='#52c41a';}}

  function detectFilename(){
    const params=new URLSearchParams(location.search);
    currentFileName=params.get('file')||'';
    // 从 title 推断
    if(!currentFileName){
      const title=document.title||'';
      currentFileName=title+'.html';
    }
    const el=$('eb-filename');
    if(el)el.textContent=currentFileName||'未命名';
  }

  function undoHistory(){document.execCommand('undo',false,null);toast('撤销');}
  function redoHistory(){document.execCommand('redo',false,null);toast('重做');}

  async function saveToServer(){
    const wasEditing=editMode;
    if(wasEditing)toggleEditMode(false);
    document.querySelectorAll('.ppt-page-controls,.ppt-drag-handle').forEach(c=>c.remove());
    document.querySelectorAll('.ppt-selected').forEach(c=>c.classList.remove('ppt-selected'));
    document.querySelectorAll('.ppt-img-wrap').forEach(c=>c.classList.remove('ppt-img-wrap'));
    document.querySelectorAll('#deck > section.slide').forEach(s=>s.style.zoom='');

    const html='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
    const s=$('eb-status');s.textContent='保存中...';s.style.color='#888';
    try{
      const body=new URLSearchParams();
      body.append('html',html);
      body.append('file',currentFileName);
      const res=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
      const data=await res.json();
      if(data.ok){clearDirty();toast('✓ 已保存',1800);if(data.name)currentFileName=data.name;$('eb-filename').textContent=currentFileName;}
      else{toast('失败: '+data.error,3000);}
    }catch(err){toast('出错: '+err.message,3000);}
    if(wasEditing)setTimeout(()=>toggleEditMode(true),200);
  }

  /* ============================================================
     编辑模式开关
     ============================================================ */
  function toggleEditMode(force){
    editMode=force!==undefined?force:!editMode;
    document.body.classList.toggle('ppt-editing',editMode);
    document.body.classList.toggle('ppt-sidebar-on',editMode);
    document.body.classList.toggle('ppt-inspector-on',editMode);
    const btn=$('eb-toggle');
    btn.textContent=editMode?'✓ 编辑中':'编辑';
    btn.classList.toggle('primary',!editMode);
    $('ppt-sidebar').classList.toggle('show',editMode);
    $('ppt-inspector').classList.toggle('show',editMode);
    if(editMode){
      markEditable();
      buildSidebar();
      toast('编辑模式: 左栏切页 · 点文字编辑 · 点图片拖动/缩放 · 右栏调属性',3500);
    }else{
      unmarkEditable();
      hideGuides();
      clearInspector();
      applyZoom(1);   // 退出编辑时重置缩放
    }
  }

  /* ============================================================
     绑定 + 启动
     ============================================================ */
  function bind(){
    $('eb-toggle').onclick=()=>toggleEditMode();
    $('eb-add-page').onclick=addPage;
    $('eb-dup-page').onclick=addPage;
    $('eb-del-page').onclick=()=>delSlide(window.__currentSlideIndex||0);
    $('eb-save').onclick=saveToServer;
    $('eb-help').onclick=()=>toast('左栏切页 · 点文字改 · 点图片拖/缩放 · 右栏调字号颜色 · Cmd+S保存 · 右下角缩放',5000);
    setupZoom();
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();saveToServer();}
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)redoHistory();else undoHistory();}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();redoHistory();}
      if(e.key==='Escape'){clearInspector();hideGuides();}
    });
    document.addEventListener('input',e=>{if(e.target.getAttribute('contenteditable')==='true')markDirty();});
    // 翻页时更新左栏高亮
    const origGo=window.go;
    if(origGo){window.go=function(n){origGo(n);updateSidebarActive();};}
    window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='有未保存修改';}});
  }
  function init(){
    buildUI();bind();detectFilename();
    setTimeout(()=>toast('编辑器就绪 · 点"编辑"开始 · Cmd+S保存 · Cmd+Z撤销',2500),600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
