import io
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_resume_pdf(resume_text: str, template: str = "modern") -> bytes:
    buffer = io.BytesIO()
    
    # Calculate margins and layout based on template
    margins = 36 if template == "minimal" else 40
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=margins, leftMargin=margins,
                            topMargin=margins, bottomMargin=margins)

    styles = getSampleStyleSheet()
    
    # Template Styles Setup
    if template == "modern":
        h1_color = white
        h2_color = HexColor("#2563eb")
        bg_color = HexColor("#1a2332")
        body_color = black
        rule_color = HexColor("#2563eb")
        rule_thickness = 1.5
    elif template == "classic":
        h1_color = black
        h2_color = black
        bg_color = white
        body_color = black
        rule_color = black
        rule_thickness = 1
    else:  # minimal
        h1_color = HexColor("#222222")
        h2_color = HexColor("#444444")
        bg_color = HexColor("#fafafa")
        body_color = HexColor("#333333")
        rule_color = HexColor("#cbd5e1")
        rule_thickness = 0.5

    # Define custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=h1_color,
        alignment=TA_CENTER if template == "modern" else TA_LEFT,
        spaceAfter=20
    )
    
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=h2_color,
        spaceBefore=15,
        spaceAfter=5
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        textColor=body_color,
        leading=14,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        textColor=body_color,
        leading=14
    )

    story = []
    
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    
    if not lines:
        return buffer.getvalue()

    # Treat the first line as the Name/Title
    story.append(Paragraph(lines[0], title_style))
    
    for line in lines[1:]:
        # Detect headings (All caps or explicitly short lines that look like headers)
        # Simplified logic: If line is short and uppercase, it's a heading
        if len(line) < 40 and line.isupper():
            story.append(Paragraph(line, heading_style))
            story.append(HRFlowable(width="100%", color=rule_color, thickness=rule_thickness, spaceAfter=10))
        elif line.startswith('- ') or line.startswith('• '):
            clean_line = line.lstrip('-• \t')
            story.append(Paragraph(f"• {clean_line}", bullet_style))
        else:
            story.append(Paragraph(line, body_style))

    # For modern template, ReportLab can't easily do a full-width header background
    # using SimpleDocTemplate without custom flowables or page templates. 
    # For now, we rely on text coloring.

    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
