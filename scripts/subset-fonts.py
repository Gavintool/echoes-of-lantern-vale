"""Build local Chinese webfont subsets from the current game copy."""
import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]


def make_font(source, output, family, text):
    font = TTFont(source)
    options = subset.Options()
    options.name_IDs = ["*"]
    worker = subset.Subsetter(options)
    worker.populate(text=text)
    worker.subset(font)
    replacements = {1: family, 3: family + " 1.1", 4: family, 6: family.replace(" ", ""), 16: family}
    for record in font["name"].names:
        if record.nameID in replacements:
            record.string = replacements[record.nameID].encode(record.getEncoding())
    if "CFF " in font:
        top = font["CFF "].cff.topDictIndex[0]
        font["CFF "].cff.fontNames = [replacements[6]]
        top.FullName = family
        top.FamilyName = family
    font.flavor = "woff2"
    font.save(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sans", type=Path, required=True)
    parser.add_argument("--serif", type=Path, required=True)
    args = parser.parse_args()
    paths = [ROOT / "index.html", *sorted((ROOT / "src").glob("*.js"))]
    text = "".join(path.read_text(encoding="utf-8") for path in paths)
    characters = "".join(sorted(set(text) | set(chr(code) for code in range(32, 127))))
    output = ROOT / "src" / "fonts"
    make_font(args.sans, output / "lantern-sans.woff2", "Lantern Sans", characters)
    make_font(args.serif, output / "lantern-serif.woff2", "Lantern Serif", characters)


if __name__ == "__main__":
    main()
