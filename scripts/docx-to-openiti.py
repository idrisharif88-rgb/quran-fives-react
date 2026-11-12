#!/usr/bin/env python3
"""Word (.docx) → OpenITI mARkdown, for books not in OpenITI (e.g. the owner's own).

    python3 scripts/docx-to-openiti.py book.docx out.mARkdown --uri Local.Name.Author-ara1 \
        --title "..." --author "..."

Chapters: a paragraph starting with المقدمة / الفصل … / الخاتمة becomes "### |". A bare
«الفصل الأول» takes the next paragraph as its title. Text before the first chapter goes
under «عن الكتاب». No page markers: Word's rendered pages are not a printed edition.
Images and empty paragraphs are dropped. Standard library only.
"""
import argparse, re, zipfile, html

CHAPTER = re.compile(r'^(المقدمة|مقدمة|الخاتمة|خاتمة|الفصل\s+\S+)\s*[:.]?\s*(.*)$')


def paragraphs(path):
    xml = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8')
    for p in re.findall(r'<w:p[ >].*?</w:p>', xml, flags=re.S):
        text = ''.join(re.findall(r'<w:t[^>]*>(.*?)</w:t>', p, flags=re.S))
        text = re.sub(r'\s+', ' ', html.unescape(text)).strip()
        if text:
            yield text


def convert(paras, uri, title, author):
    out = ['######OpenITI#', '',
           f'#META# 000.BookURI\t:: #{uri}',
           f'#META# 020.BookTITLE\t:: {title}',
           f'#META# 010.AuthorNAME\t:: {author}',
           '', '#META#Header#End#', '', '### | عن الكتاب']
    i = 0
    while i < len(paras):
        text = paras[i]
        m = CHAPTER.match(text)
        if m and len(text) < 90:
            name, rest = m.group(1), m.group(2).strip()
            if name.startswith('الفصل') and not rest and i + 1 < len(paras) and len(paras[i + 1]) < 90:
                rest = paras[i + 1]
                i += 1
            out.append(f'### | {name}: {rest}' if rest else f'### | {name}')
        else:
            out.append('# ' + text)
        i += 1
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('docx'); ap.add_argument('out')
    ap.add_argument('--uri', required=True); ap.add_argument('--title', required=True); ap.add_argument('--author', required=True)
    a = ap.parse_args()
    paras = list(paragraphs(a.docx))
    md = convert(paras, a.uri, a.title, a.author)
    open(a.out, 'w', encoding='utf-8').write(md)
    print(f'{len(paras)} paragraphs, {md.count(chr(10) + "### |")} chapters → {a.out}')
