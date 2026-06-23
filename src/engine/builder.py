import json
import re
from pathlib import Path
from typing import Any

from .theme import ThemeManager
from .layout import LayoutManager
from .component import ComponentRegistry


class SlideBuilder:
    """幻灯片构建器：负责将数据和布局组装成完整 HTML"""

    BASE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&family=Noto+Sans+SC:wght@200;300;400;500;700;900&display=swap" rel="stylesheet">
<style>
{theme_css}
{base_css}
{layout_css}
{component_css}
</style>
</head>
<body>
<div id="deck" data-transition="{transition}">
{slides_html}
</div>
<div id="nav"></div>
<div id="hint">← → 翻页</div>
<script>
{deck_script}
</script>
</body>
</html>"""

    def __init__(self, theme: str = "dark-tech", transition: str = "fade"):
        self.theme = theme
        self.transition = transition
        self.theme_mgr = ThemeManager()
        self.layout_mgr = LayoutManager()
        self.component_reg = ComponentRegistry()

    def build_slide(self, layout: str, data: dict) -> str:
        """根据布局名称和数据构建单个幻灯片 HTML"""
        layout_def = self.layout_mgr.get_layout(layout)
        if not layout_def:
            return self._build_fallback_slide(data)

        html = layout_def["template"]
        # 替换数据占位符
        for key, value in data.items():
            placeholder = f"{{{key}}}"
            if placeholder in html:
                html = html.replace(placeholder, self._render_value(value))

        # 处理组件
        html = self.component_reg.render_components(html, data)
        # 清理未使用的占位符
        html = re.sub(r'\{[\w-]+\}', '', html)
        return html

    def _render_value(self, value: Any) -> str:
        """将值渲染为 HTML 字符串"""
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            return "\n".join(str(v) for v in value)
        if isinstance(value, dict):
            if value.get("type") == "image":
                return self._render_image(value)
            if value.get("type") == "chart":
                return self._render_chart(value)
            if value.get("type") == "table":
                return self._render_table(value)
            if value.get("type") == "code":
                return self._render_code(value)
            return str(value)
        return str(value)

    def _render_image(self, data: dict) -> str:
        src = data.get("src", "")
        alt = data.get("alt", "")
        cls = data.get("class", "frame-img r-16x9")
        return f'<figure class="{cls}"><img src="{src}" alt="{alt}"></figure>'

    def _render_chart(self, data: dict) -> str:
        chart_type = data.get("chart_type", "bar")
        if chart_type == "bar":
            return self._render_bar_chart(data)
        return "<!-- chart placeholder -->"

    def _render_bar_chart(self, data: dict) -> str:
        items = data.get("data", [])
        max_val = max((item.get("value", 0) for item in items), default=1)
        rows = []
        for item in items:
            label = item.get("label", "")
            value = item.get("value", 0)
            pct = (value / max_val * 100) if max_val else 0
            rows.append(
                f'<div class="bar-row">'
                f'<div class="bar-label">{label}</div>'
                f'<div class="bar-track"><div class="bar-fill" style="width:{pct}%"></div></div>'
                f'<div class="bar-value">{value}</div>'
                f'</div>'
            )
        return f'<div class="bar-chart">\n' + "\n".join(rows) + '\n</div>'

    def _render_table(self, data: dict) -> str:
        headers = data.get("headers", [])
        rows = data.get("rows", [])
        ths = "".join(f"<th>{h}</th>" for h in headers)
        trs = []
        for row in rows:
            tds = "".join(f"<td>{c}</td>" for c in row)
            trs.append(f"<tr>{tds}</tr>")
        return f'<table class="hp-table"><thead><tr>{ths}</tr></thead><tbody>{"".join(trs)}</tbody></table>'

    def _render_code(self, data: dict) -> str:
        code = data.get("code", "")
        lang = data.get("lang", "")
        escaped = code.replace("<", "&lt;").replace(">", "&gt;")
        return f'<pre class="hp-code"><code class="language-{lang}">{escaped}</code></pre>'

    def _build_fallback_slide(self, data: dict) -> str:
        """回退布局"""
        title = data.get("title", "")
        content = data.get("content", "")
        return f'<section class="slide">\n<div class="frame">\n<h1 class="h-xl">{title}</h1>\n<p class="lead">{content}</p>\n</div>\n</section>'

    def assemble(self, title: str, slides: list[str]) -> str:
        """将所有幻灯片组装成完整 HTML 文件"""
        theme_css = self.theme_mgr.get_theme_css(self.theme)
        base_css = self._get_base_css()
        layout_css = self.layout_mgr.get_all_css()
        component_css = self.component_reg.get_all_css()
        slides_html = "\n".join(slides)
        deck_script = self._get_deck_script()

        return self.BASE_TEMPLATE.format(
            title=title,
            transition=self.transition,
            theme_css=theme_css,
            base_css=base_css,
            layout_css=layout_css,
            component_css=component_css,
            slides_html=slides_html,
            deck_script=deck_script,
        )

    def _get_base_css(self) -> str:
        return BASE_CSS

    def _get_deck_script(self) -> str:
        return DECK_SCRIPT


BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:var(--paper);color:var(--ink);font-family:var(--sans),var(--sans-zh);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
#deck{position:fixed;inset:0;width:10000vw;height:100vh;display:flex;flex-wrap:nowrap;transition:transform .9s cubic-bezier(.77,0,.175,1);z-index:10;will-change:transform}
.slide{width:100vw;height:100vh;flex:0 0 100vw;position:relative;padding:5.5vh 5vw 7vh 5vw;display:flex;flex-direction:column;overflow:hidden;background:var(--paper);color:var(--ink)}
#nav{position:fixed;left:50%;bottom:2vh;transform:translateX(-50%);z-index:30;display:flex;gap:10px;padding:0;background:transparent;border:0}
#nav .dot{width:6px;height:6px;background:rgba(0,0,0,.28);cursor:pointer;transition:all .25s ease;border:0;padding:0;border-radius:0}
#nav .dot:hover{background:rgba(0,0,0,.55)} #nav .dot.active{background:var(--accent);width:18px}
body.dark-bg #nav .dot{background:rgba(255,255,255,.32)} body.dark-bg #nav .dot.active{background:var(--accent)}
#hint{position:fixed;bottom:2.4vh;right:2.5vw;z-index:30;font-family:var(--mono);font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.4;color:var(--ink-tint, currentColor)}
[data-anim]{opacity:1} body.motion-ready [data-anim]{opacity:0}
body.motion-ready [data-anim="left"]{transform:translateX(-24px)} body.motion-ready [data-anim="right"]{transform:translateX(24px)}
body.motion-ready [data-anim="line"]{opacity:0;transform:translateY(10px)}
body.low-power #deck{transition:none!important} body.low-power *, body.low-power *::before, body.low-power *::after{animation:none!important;transition:none!important}
body.low-power.motion-ready [data-anim], body.low-power [data-anim]{opacity:1!important;transform:none!important}
.hp-table{width:100%;border-collapse:collapse;font-size:max(14px,.92vw);margin-top:2vh}
.hp-table th,.hp-table td{padding:1.2vh 1.2vw;text-align:left;border-bottom:1px solid var(--border-subtle)}
.hp-table th{font-family:var(--mono);font-size:max(12px,.78vw);letter-spacing:.14em;text-transform:uppercase;opacity:.7;border-bottom:2px solid var(--ink)}
.hp-table tr:hover td{background:rgba(127,127,127,.06)}
.hp-code{background:var(--grey-1);padding:2.4vh 2vw;border-radius:4px;overflow-x:auto;font-family:var(--mono);font-size:max(13px,.82vw);line-height:1.6;margin-top:2vh;border-left:3px solid var(--accent)}
.hp-code code{color:var(--ink);background:transparent;padding:0}
.hp-shape{display:inline-block}
.hp-shape.circle{border-radius:50%}
.hp-shape.rect{border-radius:0}
.hp-shape.rounded{border-radius:8px}
.hp-video{width:100%;max-height:60vh;object-fit:cover;border-radius:4px}
.hp-embed{width:100%;height:100%;border:0;border-radius:4px;min-height:50vh}
.hp-formula{font-size:max(16px,1.2vw);margin:2vh 0;text-align:center}
.hp-quote{padding:2vh 2vw;border-left:3px solid var(--accent);font-size:max(16px,1.1vw);line-height:1.6;opacity:.9;margin:2vh 0}
.hp-quote cite{display:block;margin-top:1.2vh;font-family:var(--mono);font-size:max(12px,.82vw);letter-spacing:.12em;text-transform:uppercase;opacity:.6}
.h-hero{font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:11vw;line-height:.92;letter-spacing:-.04em}
.h-xl{font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:6vw;line-height:1;letter-spacing:-.03em}
.h-md{font-family:var(--sans),var(--sans-zh);font-weight:300;font-size:2.6vw;line-height:1.18;letter-spacing:-.015em}
.h-sub{font-family:var(--sans),var(--sans-zh);font-weight:400;font-size:2.2vw;line-height:1.3;letter-spacing:-.01em;opacity:.7}
.lead{font-family:var(--sans),var(--sans-zh);font-weight:400;font-size:1.55vw;line-height:1.4;letter-spacing:-.005em;opacity:.86}
.body{font-family:var(--sans),var(--sans-zh);font-weight:400;font-size:max(18px,1.08vw);line-height:1.6;letter-spacing:0;opacity:.78}
.meta{font-family:var(--mono);font-size:max(14px,.82vw);letter-spacing:.18em;text-transform:uppercase;opacity:.6}
.kicker{font-family:var(--mono);font-size:14px;letter-spacing:.24em;text-transform:uppercase;opacity:.65;margin-bottom:2.4vh;display:inline-flex;align-items:center;gap:.8em}
.kicker::before{content:"";width:24px;height:1px;background:currentColor;opacity:.6}
.frame{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.col{display:flex;flex-direction:column;gap:2vh}
.row{display:flex;align-items:center;gap:2vw}
.fill{flex:1}
.center{align-items:center;justify-content:center;text-align:center}
.right{text-align:right;justify-self:end}
.top{align-self:start}
.bottom{align-self:end}
.va-center{align-self:center}
.grid-12{display:grid;grid-template-columns:repeat(12,1fr);gap:2vh 1.2vw;align-items:start}
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:3vw 4vh;align-items:start}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:3vw 4vh;align-items:start}
.grid-4{display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:3vh 3vw;flex:1;align-content:center}
.span-2{grid-column:span 2}
.span-3{grid-column:span 3}
.span-4{grid-column:span 4}
.span-6{grid-column:span 6}
.span-8{grid-column:span 8}
.span-12{grid-column:span 12}
.bar-chart{display:flex;flex-direction:column;gap:1.4vh}
.bar-row{display:grid;grid-template-columns:8em 1fr 4em;gap:1.4vw;align-items:center}
.bar-row .bar-label{font-family:var(--mono);font-size:max(14px,.84vw);letter-spacing:.14em;text-transform:uppercase;opacity:.7}
.bar-row .bar-track{height:14px;background:rgba(127,127,127,.18);position:relative}
.bar-row .bar-fill{height:100%;background:var(--accent);position:absolute;left:0;top:0}
.bar-row .bar-value{font-family:var(--sans);font-weight:700;font-size:max(16px,1.05vw);text-align:right;font-feature-settings:"tnum"}
.stat-card{display:flex;flex-direction:column;gap:.6vh;align-items:flex-start;padding-top:1.6vh;border-top:2px solid currentColor}
.stat-card .stat-label{font-family:var(--mono);font-size:max(14px,.82vw);letter-spacing:.24em;text-transform:uppercase;opacity:.6}
.stat-card .stat-nb{font-family:var(--sans);font-weight:800;font-size:5.6vw;line-height:.88;letter-spacing:-.035em;font-feature-settings:"tnum";margin-top:.4vh}
"""

DECK_SCRIPT = """
(function(){
'use strict';
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
window.go=go;
document.addEventListener('keydown',e=>{
  if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '||e.key==='PageDown'){e.preventDefault();go(idx+1);}
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();go(idx-1);}
  else if(e.key==='Home'){e.preventDefault();go(0);}
  else if(e.key==='End'){e.preventDefault();go(total-1);}
});
const nav=document.getElementById('nav');
if(nav&&!nav.children.length){
  slides.forEach((s,i)=>{
    const b=document.createElement('button');b.className='dot';b.dataset.i=i;
    b.setAttribute('aria-label','Page '+(i+1)); b.onclick=()=>go(i); nav.appendChild(b);
  });
}
const EASE=[0,0,.3,1];
const ANIM_MAP={
  line:{opacity:[0,1],y:[10,0]}, up:{opacity:[0,1],y:[20,0]}, down:{opacity:[0,1],y:[-20,0]},
  left:{opacity:[0,1],x:[-24,0]}, right:{opacity:[0,1],x:[24,0]},
  kicker:{opacity:[0,1],y:[8,0]}, title:{opacity:[0,1],y:[16,0]},
  bottom:{opacity:[0,1],y:[14,0]}, lead:{opacity:[0,1],y:[12,0]},
  img:{opacity:[0,1],scale:[.96,1]}, bars:{opacity:[0,1],scaleY:[.6,1]},
  kpi:{opacity:[0,1],y:[12,0]}, hero:{opacity:[0,1],scale:[.92,1]},
  fadeIn:{opacity:[0,1]}, fadeInUp:{opacity:[0,1],y:[30,0]}, fadeInDown:{opacity:[0,1],y:[-30,0]},
  fadeInLeft:{opacity:[0,1],x:[-40,0]}, fadeInRight:{opacity:[0,1],x:[40,0]},
  zoomIn:{opacity:[0,1],scale:[.85,1]}, slideInLeft:{opacity:[0,1],x:[-100,0]},
  slideInRight:{opacity:[0,1],x:[100,0]}, pulse:{opacity:[0,1],scale:[.95,1.05]},
  shake:{opacity:[0,1]}, flipX:{opacity:[0,1]},
};
const DEFAULT_ANIM={opacity:[0,1],y:[12,0]};
document.body.classList.add('motion-ready');
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
    Object.entries(params).forEach(([prop,[from,to]])=>{
      if(prop==='x')kf.transform=['translateX('+from+'px)','translateX('+to+'px)'];
      else if(prop==='y')kf.transform=(kf.transform?[kf.transform[0],'translateY('+to+'px)']:['translateY('+from+'px)','translateY('+to+'px)']);
      else if(prop==='scale')kf.transform=(kf.transform?[kf.transform[0],'scale('+to+')']:['scale('+from+')','scale('+to+')']);
      else kf[prop]=[from,to];
    });
    try{el.animate(kf,{duration:600,delay:k*80,easing:'cubic-bezier('+EASE.join(',')+')',fill:'forwards'});}catch(e){}
  });
}
const origGo=window.go;
window.go=function(n){origGo(n);setTimeout(()=>playSlide(window.__currentSlideIndex||0),450);};
setTimeout(()=>playSlide(0),300);
const ps=document.createElement('style');
ps.textContent='@media print{@page{size:landscape;margin:0}html,body{overflow:visible!important;width:auto!important;height:auto!important}#deck{position:static!important;width:auto!important;height:auto!important;display:block!important;transform:none!important;transition:none!important}#deck>section.slide{width:100vw!important;height:100vh!important;page-break-after:always;break-after:page;page-break-inside:avoid;break-inside:avoid;transform:none!important;opacity:1!important;display:block!important}#deck>section.slide:last-child{page-break-after:auto}#nav,#hint,.ppt-page-controls{display:none!important}[data-anim]{opacity:1!important;transform:none!important}}';
document.head.appendChild(ps);
})();
"""
