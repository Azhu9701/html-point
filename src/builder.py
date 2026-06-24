"""演示稿结构化构建器 v2

从 JSON 规范生成 HTML Point 演示稿。
每个布局使用干净的硬编码模板，不残留 demo 文字。
AI 只需描述内容 + 选布局，排版由模板负责。
"""

import json
import re
from pathlib import Path
from .storage import save_file

ROOT = Path(__file__).resolve().parent.parent

# ═══════════════════════════════════════════
# 干净布局模板 (不从 demo 提取，无残留文字)
# ═══════════════════════════════════════════

TEMPLATES = {
    "hero": """<section class="slide dark trans-fade" data-layout="S01" data-animate="hero" style="font-size:11px;color:#fff;background:#000">
  <div class="canvas-card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;height:100%;gap:3vh;padding:5vh 8vw">
    <div class="chrome-min" style="display:flex;justify-content:space-between;width:100%">
      <span style="color:rgba(255,255,255,.45)">{page}</span>
      <span style="color:var(--accent);letter-spacing:.15em;font-size:11px">{tagline}</span>
    </div>
    <h1 style="font-family:var(--sans);font-size:min(7vw,12vh);font-weight:200;line-height:1.05;letter-spacing:-.03em;color:#fff;max-width:16ch;margin-top:2vh">{title}</h1>
    <p style="font-family:var(--sans),var(--sans-zh);font-size:max(18px,1.4vw);color:rgba(255,255,255,.7);font-weight:300;max-width:44ch;line-height:1.5">{subtitle}</p>
    <div style="margin-top:3vh;font-family:var(--sans);font-size:max(14px,1vw);color:rgba(255,255,255,.45)">{author} · {date}</div>
  </div>
</section>""",

    "statement": """<section class="slide dark trans-fade" data-layout="S03" data-animate="statement" style="font-size:11px;color:#fff;background:#000">
  <div class="canvas-card" style="padding:6vh 5vw;height:100%">
    <div class="chrome-min">
      <span style="color:rgba(255,255,255,.45)">{page}</span>
      <span style="color:var(--accent);letter-spacing:.15em">{label}</span>
    </div>
    <div class="split-half" style="margin-top:4vh;gap:4vw">
      <div class="half">
        <h2 style="font-family:var(--sans),var(--sans-zh);font-size:min(5vw,9vh);font-weight:200;line-height:1.1;letter-spacing:-.025em;color:#fff">{title}</h2>
      </div>
      <div class="half">
        <p style="font-family:var(--sans),var(--sans-zh);font-size:max(18px,1.2vw);line-height:1.75;color:rgba(255,255,255,.75);font-weight:300">{body}</p>
      </div>
    </div>
  </div>
</section>""",

    "grid": """<section class="slide dark trans-fade" data-layout="S05" data-animate="grid-reveal" style="font-size:11px;color:#fff;background:#000">
  <div class="canvas-card" style="padding:5vh 4vw;height:100%">
    <div class="chrome-min">
      <span style="color:rgba(255,255,255,.45)">{page}</span>
      <span style="color:var(--accent);letter-spacing:.15em">{section}</span>
    </div>
    <h3 style="font-family:var(--sans);font-size:max(20px,1.5vw);font-weight:300;color:#fff;margin:3vh 0 2vh">{section_title}</h3>
    <div class="sub-grid-3-2" style="display:grid;grid-template-columns:1fr 1fr;gap:2vh 2vw">{items_html}</div>
  </div>
</section>""",

    "whynow": """<section class="slide dark trans-fade" data-layout="S18" data-animate="why-now" style="font-size:11px;color:#fff;background:#000">
  <div class="canvas-card" style="padding:5vh 4vw;height:100%">
    <div class="chrome-min">
      <span style="color:rgba(255,255,255,.45)">{page}</span>
      <span style="color:var(--accent);letter-spacing:.15em">{label}</span>
    </div>
    <h2 style="font-family:var(--sans);font-size:min(5vw,8vh);font-weight:200;color:#fff;margin:3vh 0 2vh;letter-spacing:-.02em">{title}</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2.5vw;margin-top:3vh">{reasons_html}</div>
  </div>
</section>""",

    "split": """<section class="slide dark trans-fade" data-layout="S08" data-animate="duo-mirror" style="font-size:11px;color:#fff;background:#000">
  <div class="canvas-card" style="padding:5vh 4vw;height:100%">
    <div class="chrome-min">
      <span style="color:rgba(255,255,255,.45)">{page}</span>
      <span style="color:var(--accent);letter-spacing:.15em">{label}</span>
    </div>
    <div class="split-half" style="margin-top:4vh;gap:3vw">
      <div class="half" style="border-right:1px solid var(--border-subtle);padding-right:3vw">
        <div style="color:rgba(255,255,255,.45);font-size:12px;letter-spacing:.15em;margin-bottom:2vh">{left_label}</div>
        <p style="font-family:var(--sans),var(--sans-zh);font-size:max(17px,1.1vw);line-height:1.7;color:rgba(255,255,255,.65);font-weight:300">{left_body}</p>
      </div>
      <div class="half">
        <div style="color:var(--accent);font-size:12px;letter-spacing:.15em;margin-bottom:2vh">{right_label}</div>
        <p style="font-family:var(--sans),var(--sans-zh);font-size:max(17px,1.1vw);line-height:1.7;color:rgba(255,255,255,.82);font-weight:300">{right_body}</p>
      </div>
    </div>
  </div>
</section>""",

    "closing": """<section class="slide dark trans-fade" data-layout="S10" data-animate="split-statement" style="font-size:11px;color:#fff;background:#000">
  <div class="canvas-card" style="padding:6vh 5vw;height:100%;max-width:900px;margin:0 auto">
    <div class="chrome-min">
      <span style="color:rgba(255,255,255,.45)">{page}</span>
      <span style="color:var(--accent);letter-spacing:.15em">{tagline}</span>
    </div>
    <div style="margin-top:5vh">
      <div style="color:rgba(255,255,255,.55);font-size:13px;letter-spacing:.22em;margin-bottom:2vh">{thank}</div>
      <h2 style="font-family:var(--sans),var(--sans-zh);font-size:min(5vw,9vh);font-weight:200;line-height:1.1;color:#fff;margin-bottom:2vh">{thank_title}</h2>
      <p style="font-family:var(--sans),var(--sans-zh);font-size:max(18px,1.2vw);line-height:1.6;color:rgba(255,255,255,.6);max-width:60ch;margin-bottom:5vh">{thank_sub}</p>
    </div>
    {items_html}
    <div style="text-align:right;margin-top:4vh;color:rgba(255,255,255,.35);font-size:max(13px,.85vw);border-top:2px solid var(--accent);padding-top:2.5vh">{footer}</div>
  </div>
</section>""",
}

LAYOUT_CATALOG = {
    "hero":    {"name":"封面","desc":"大标题+副标题+作者","fields":["title","subtitle","author","date","tagline"]},
    "statement":{"name":"宣言页","desc":"左侧大标题+右侧说明","fields":["label","title","body"]},
    "grid":    {"name":"网格卡片","desc":"2列卡片网格","fields":["section","section_title","items"]},
    "whynow":  {"name":"三论点","desc":"3列并排论点卡片","fields":["label","title","reasons"]},
    "split":   {"name":"左右对比","desc":"左右对比分析","fields":["left_label","left_body","right_label","right_body","label"]},
    "closing": {"name":"结尾页","desc":"感谢+要点+底栏","fields":["thank","thank_title","thank_sub","tagline","summary_items","footer"]},
}

def _build_items_html(items):
    """生成网格卡片 HTML"""
    html = ""
    for item in items:
        html += (
            '<div class="sub-card" style="background:var(--grey-1);padding:2.5vh 2vw;border-radius:6px">'
            f'<p style="color:#fff;font-size:max(15px,1vw);line-height:1.5;font-weight:300">{item}</p>'
            '</div>\n'
        )
    return html

def _build_reasons_html(reasons):
    """生成三论点卡片 HTML"""
    html = ""
    for r in reasons:
        title = r.get("title","")
        desc = r.get("desc","")
        html += (
            '<div style="background:var(--grey-1);padding:3vh 2vw;border-radius:8px;border-left:3px solid var(--accent)">'
            f'<h3 style="color:#fff;font-size:max(17px,1.2vw);font-weight:400;margin-bottom:1.5vh">{title}</h3>'
            f'<p style="color:rgba(255,255,255,.7);font-size:max(15px,1vw);line-height:1.6;font-weight:300">{desc}</p>'
            '</div>\n'
        )
    return html

def _build_closing_items(items):
    """生成结尾页要点 HTML"""
    html = ""
    for i, item in enumerate(items):
        if isinstance(item, dict):
            title = item.get("title","")
            desc = item.get("desc","")
        else:
            title = str(item); desc = ""
        color = "var(--accent)" if i == len(items)-1 else "rgba(255,255,255,.6)"
        html += (
            '<div style="display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;'
            f'padding:2.2vh 0;border-top:1px solid var(--border-subtle)">'
            f'<span style="font-family:var(--sans);font-weight:200;font-size:min(3.5vw,6vh);color:{color}">{i+1:02d}</span>'
            '<div>'
            f'<h3 style="color:#fff;font-size:max(17px,1.2vw);font-weight:400;margin-bottom:.8vh">{title}</h3>'
            f'<p style="color:rgba(255,255,255,.7);font-size:max(15px,1vw);line-height:1.6;font-weight:300">{desc}</p>'
            '</div></div>\n'
        )
    return html

def build_presentation(spec_or_path, presentations_dir, design_key="tokyo-night"):
    """从 JSON 规范构建演示稿"""
    if isinstance(spec_or_path, str) and spec_or_path.endswith(".json"):
        spec = json.loads(Path(spec_or_path).read_text(encoding="utf-8"))
    elif isinstance(spec_or_path, str):
        spec = json.loads(spec_or_path)
    else:
        spec = spec_or_path

    title = spec.get("title","演示稿")
    design_key = spec.get("design","tokyo-night")  # 新增: 设计系统选择
    slides_spec = spec.get("slides",[])
    total = len(slides_spec)

    # 注入设计系统 CSS Token
    from .design import get_css_for, get as get_design
    ds = get_design(design_key) or get_design("tokyo-night")
    css_vars = get_css_for(design_key)
    tp = ds.type   # 排版 Token
    sp = ds.spacing  # 间距 Token

    # 构造 HTML
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&family=Noto+Sans+SC:wght@200;300;400;500;700;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {{{css_vars}
    --sans:{tp.family_heading};
    --sans-zh:'PingFang SC','Noto Sans SC',system-ui,sans-serif;
    --mono:{tp.family_mono};
    --sp-xs:{sp.xs};--sp-sm:{sp.sm};--sp-md:{sp.md};--sp-lg:{sp.lg};--sp-xl:{sp.xl};--sp-xxl:{sp.xxl};
  }}
  * {{box-sizing:border-box;margin:0;padding:0}}
  html,body {{width:100%;height:100%;overflow:hidden;background:var(--paper);color:var(--ink);font-family:var(--sans),var(--sans-zh);font-feature-settings:"ss01","cv11";-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}}
  #deck {{position:fixed;inset:0;width:{total*100}vw;height:100vh;display:flex;flex-wrap:nowrap;transition:transform .9s cubic-bezier(.77,0,.175,1);z-index:10;will-change:transform}}
  .slide {{width:100vw;height:100vh;flex:0 0 100vw;position:relative;display:flex;flex-direction:column;overflow:hidden;background:var(--paper);color:var(--ink)}}
  .slide.grey {{background:var(--grey-1)}}
  .slide.dark {{background:var(--paper);color:var(--ink)}}
  .chrome-min {{display:flex;justify-content:space-between;align-items:center;font-size:{tp.size_xs};color:var(--text-helper)}}
  .split-half {{display:flex;gap:var(--sp-lg)}}
  .half {{flex:1;display:flex;flex-direction:column;justify-content:center}}
  .sub-card {{background:var(--grey-1);border-radius:6px;transition:transform .15s}}
  .sub-card:hover {{transform:translateY(-2px)}}
  .canvas-card {{width:100%;max-width:{ds.layout.max_width};margin:0 auto}}
  #nav {{position:fixed;left:50%;bottom:2vh;transform:translateX(-50%);z-index:30;display:flex;gap:10px}}
  #nav .dot {{width:6px;height:6px;background:rgba(128,128,128,.28);cursor:pointer;transition:all .25s;border:0;padding:0;border-radius:0}}
  #nav .dot.active {{background:var(--accent);width:18px}}
  [data-anim] {{opacity:1}}
</style>
</head>
<body>
<div id="deck">"""

    for i, s in enumerate(slides_spec):
        lname = s.get("layout","statement")
        tpl_html = TEMPLATES.get(lname, TEMPLATES["statement"])
        page = f"{i+1:02d} / {total:02d}"

        # 公共变量
        vars = {
            "page": page,
            "label": s.get("label",""),
            "title": s.get("title",""),
            "tagline": s.get("tagline",""),
            "subtitle": s.get("subtitle",""),
            "author": s.get("author",""),
            "date": s.get("date",""),
            "body": s.get("body",""),
            "section": s.get("section",""),
            "section_title": s.get("section_title", s.get("section","")),
            "thank": s.get("thank","THANK YOU"),
            "thank_title": s.get("thank_title","感谢"),
            "thank_sub": s.get("thank_sub",""),
            "footer": s.get("footer",""),
            "left_label": s.get("left_label",""),
            "left_body": s.get("left_body",""),
            "right_label": s.get("right_label",""),
            "right_body": s.get("right_body",""),
            "items_html": "",
            "reasons_html": "",
        }
        if "items" in s:
            vars["items_html"] = _build_items_html(s["items"])
        if "reasons" in s:
            vars["reasons_html"] = _build_reasons_html(s["reasons"])
        if "summary_items" in s:
            vars["items_html"] = _build_closing_items(s["summary_items"])

        slide_html = tpl_html.format(**vars)
        html += "\n" + slide_html

    html += "\n</div>\n<div id='nav'></div>\n"
    html += "<script>"
    html += "const d=document.getElementById('deck'),s=d.querySelectorAll('.slide'),t=s.length;let i=0,l=0;window.__currentSlideIndex=0;"
    html += "function go(n){if(l)return;i=Math.max(0,Math.min(t-1,n));window.__currentSlideIndex=i;d.style.transform='translateX('+(-i*100)+'vw)';"
    html += "const v=document.getElementById('nav');if(v)v.querySelectorAll('.dot').forEach((d,k)=>d.classList.toggle('active',k===i));l=1;setTimeout(()=>l=0,700)}"
    html += "document.addEventListener('keydown',e=>{if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;"
    html += "if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '||e.key==='PageDown'){e.preventDefault();go(i+1)}"
    html += "else if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();go(i-1)}"
    html += "else if(e.key==='Home'){e.preventDefault();go(0)}else if(e.key==='End'){e.preventDefault();go(t-1)}});"
    html += "const v=document.getElementById('nav');if(v)s.forEach((_,k)=>{const b=document.createElement('button');b.className='dot';b.dataset.i=k;b.onclick=()=>go(k);v.appendChild(b)});go(0);"
    html += "</script>\n</body>\n</html>"

    name = title.replace(" ","-").replace("/","-").replace("·","-") + ".html"
    name = re.sub(r"-+","-", name)
    result = save_file(presentations_dir, name, html)
    return result
