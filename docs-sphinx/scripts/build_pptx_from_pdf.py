#!/usr/bin/env python3
"""Convert a Sphinx-SimplePDF PDF into an editable PowerPoint deck.

Each page of the PDF becomes one A4 portrait slide. Text is extracted with its
position, font size, colour and basic style (bold/italic) so it remains
editable inside PowerPoint. Images are copied as-is when they can be decoded.
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import fitz  # PyMuPDF
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.util import Inches, Pt

# A4 dimensions at 72 points/inch, matching the PDF page size.
A4_WIDTH_IN = 8.27
A4_HEIGHT_IN = 11.69


def _to_rgb(color_int: int) -> tuple[int, int, int]:
    """Convert a 0xRRGGBB integer into (r, g, b)."""
    return (color_int >> 16) & 0xFF, (color_int >> 8) & 0xFF, color_int & 0xFF


def _is_bold(flags: int) -> bool:
    """Check the bold bit set by PyMuPDF."""
    return bool(flags & 2 ** 4)


def _is_italic(flags: int) -> bool:
    """Check the italic bit set by PyMuPDF."""
    return bool(flags & 2 ** 1)


def add_text_line(
    slide,
    text: str,
    x: float,
    y: float,
    width: float,
    height: float,
    font_size: float,
    color: tuple[int, int, int],
    bold: bool,
    italic: bool,
) -> None:
    """Add an editable text box to a slide, positioned in inches.

    The text box extends to the right margin and auto-fit is disabled so the
    requested font size is preserved even for long TOC entries.
    """
    # Prevent PowerPoint from shrinking the font by giving the box enough room.
    min_width = A4_WIDTH_IN - x - 0.3
    box_width = max(width, min_width)

    textbox = slide.shapes.add_textbox(
        Inches(x), Inches(y), Inches(box_width), Inches(max(height, font_size / 72))
    )
    tf = textbox.text_frame
    tf.word_wrap = False
    tf.auto_size = MSO_AUTO_SIZE.NONE
    p = tf.paragraphs[0]
    p.text = text
    run = p.runs[0] if p.runs else p.add_run()
    run.text = text
    font = run.font
    font.size = Pt(font_size)
    font.bold = bold
    font.italic = italic
    font.color.rgb = RGBColor(*color)


class TextLine(tuple):
    """Represents a single line of text with its layout and style information."""

    def __new__(
        cls,
        text: str,
        x: float,
        y: float,
        width: float,
        height: float,
        font_size: float,
        color: tuple[int, int, int],
        bold: bool,
        italic: bool,
    ):
        return super().__new__(cls, (text, x, y, width, height, font_size, color, bold, italic))

TextLines = list[TextLine]

def add_text_block(
    slide,
    lines: TextLines #list[tuple[str, float, float, float, float, float, tuple[int, int, int], bool, bool]],
) -> None:
    """Add a grouped block of text lines as one wrapping text box."""
    if not lines:
        return

    min_x = min(line[1] for line in lines)
    min_y = min(line[2] for line in lines)
    max_x = max(line[1] + line[3] for line in lines)
    max_y = max(line[2] + line[4] for line in lines)

    width = max(max_x - min_x, 0.1)
    height = max(max_y - min_y, 0.1)

    sizes = sorted(line[5] for line in lines)
    font_size = sizes[len(sizes) // 2]

    color = lines[0][6]
    bold = lines[0][7]
    italic = lines[0][8]

    textbox = slide.shapes.add_textbox(
        Inches(min_x), Inches(min_y), Inches(width), Inches(height)
    )
    tf = textbox.text_frame
    tf.word_wrap = True

    for idx, (text, _, _, _, _, line_size, line_color, line_bold, line_italic) in enumerate(lines):
        if idx == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = text
        run = p.runs[0] if p.runs else p.add_run()
        run.text = text
        font = run.font
        font.size = Pt(line_size)
        font.bold = line_bold
        font.italic = line_italic
        font.color.rgb = RGBColor(*line_color)
        p.space_after = Pt(0)


def add_image(slide, image_bytes: bytes, x: float, y: float, width: float, height: float) -> None:
    """Add an image to a slide from raw bytes."""
    try:
        stream = io.BytesIO(image_bytes)
        slide.shapes.add_picture(stream, Inches(x), Inches(y), Inches(width), Inches(height))
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Warning: could not add image at ({x}, {y}): {exc}", file=sys.stderr)


def _group_lines(
    lines: list[tuple[str, float, float, float, float, float, tuple[int, int, int], bool, bool]],
    y_threshold_pt: float = 2.0,
) -> list[list[tuple[str, float, float, float, float, float, tuple[int, int, int], bool, bool]]]:
    """Group lines that share the same baseline and similar font size."""
    if not lines:
        return []

    sorted_lines = sorted(lines, key=lambda line: (round(line[2] * 720), line[1]))
    groups: list[list] = []
    current_group: list = [sorted_lines[0]]

    for line in sorted_lines[1:]:
        last = current_group[-1]
        same_baseline = abs(line[2] - last[2]) <= y_threshold_pt / 72
        similar_size = abs(line[5] - last[5]) <= 1.0
        if same_baseline and similar_size:
            current_group.append(line)
        else:
            groups.append(current_group)
            current_group = [line]

    if current_group:
        groups.append(current_group)

    return groups


def convert_page(page: fitz.Page, slide) -> None:
    """Convert a single PDF page into a single PowerPoint slide."""
    blocks = page.get_text("dict")["blocks"]

    for block in blocks:
        if block["type"] == 1:  # image block
            rect = block["bbox"]
            try:
                pix = page.get_pixmap(clip=rect, matrix=fitz.Matrix(2, 2))
                image_bytes = pix.tobytes("png")
            except Exception:
                xref = block.get("image", 0)
                if xref:
                    image_bytes = page.parent.extract_image(xref)["image"]
                else:
                    continue

            x, y, w, h = rect[0] / 72, rect[1] / 72, (rect[2] - rect[0]) / 72, (rect[3] - rect[1]) / 72
            add_image(slide, image_bytes, x, y, w, h)
            continue

        if block["type"] != 0:
            continue

        raw_lines: list[tuple[str, float, float, float, float, float, tuple[int, int, int], bool, bool]] = []

        for line in block["lines"]:
            if not line["spans"]:
                continue

            bbox = line["bbox"]
            text = "".join(span["text"] for span in line["spans"])
            if not text.strip():
                continue

            first_span = line["spans"][0]
            font_size = first_span["size"]
            color_int = first_span.get("color", 0)
            flags = first_span.get("flags", 0)
            color = _to_rgb(color_int) if color_int else (0, 0, 0)

            x = bbox[0] / 72
            y = bbox[1] / 72
            width = max((bbox[2] - bbox[0]) / 72, 0.1)
            height = max((bbox[3] - bbox[1]) / 72, 0.1)

            raw_lines.append((text, x, y, width, height, font_size, color, _is_bold(flags), _is_italic(flags)))

        for group in _group_lines(raw_lines):
            if len(group) == 1:
                add_text_line(slide, *group[0])
            else:
                sizes = {line[5] for line in group}
                if len(sizes) > 1:
                    for line in group:
                        add_text_line(slide, *line)
                else:
                    add_text_block(slide, group)


def convert_pdf_to_pptx(pdf_path: Path, output_path: Path) -> None:
    """Convert *pdf_path* into an A4-portrait PowerPoint at *output_path*."""
    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(str(pdf_path))
    prs = Presentation()
    prs.slide_width = Inches(A4_WIDTH_IN)
    prs.slide_height = Inches(A4_HEIGHT_IN)
    blank_layout = prs.slide_layouts[6]

    for page in doc:
        slide = prs.slides.add_slide(blank_layout)
        convert_page(page, slide)

    doc.close()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(output_path))
    print(f"PowerPoint written to {output_path}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a Sphinx-SimplePDF PDF into an editable PowerPoint deck."
    )
    parser.add_argument(
        "--pdf",
        type=Path,
        default=Path("build/simplepdf/stellar_documentation.pdf"),
        help="Input PDF path (default: build/simplepdf/stellar_documentation.pdf).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("build/pptx/stellar_documentation.pptx"),
        help="Output PPTX path (default: build/pptx/stellar_documentation.pptx).",
    )
    args = parser.parse_args()

    convert_pdf_to_pptx(args.pdf.resolve(), args.output.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
