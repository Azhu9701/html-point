"""组件系统"""

class ComponentRegistry:
    """组件注册表：处理 HTML 中的组件标记"""

    def render_components(self, html: str, data: dict) -> str:
        """渲染 HTML 中的组件标记"""
        # 处理 <component type="..."> 标记
        import re

        def replace_component(match):
            comp_type = match.group(1)
            comp_data = match.group(2)
            return f"<!-- component: {comp_type} -->"

        html = re.sub(
            r'<component\s+type="(\w+)"\s*([^>]*)>',
            replace_component,
            html,
        )

        return html

    def get_all_css(self) -> str:
        return ""
