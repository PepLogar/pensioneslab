// A small Markdown renderer for the description of the model (docs/modelo/*.md), shown by
// metodologia.html: headings, paragraphs, nested lists, tables, quotes, code and links. Every
// piece of text is escaped first, so no HTML written in a document reaches the page.
// Comes from src/shared/markdown.js of pensiones_lab_2 1.64.0.

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const indentOf = line => line.match(/^ */)[0].length;
const LIST_ITEM = /^( *)([-*+]|\d+[.)]) +(.*)$/;
const TABLE_RULE = /^ *\|? *:?-{3,}:? *(\| *:?-{3,}:? *)*\|? *$/;

/** Heading anchor in the GitHub style: lower case, letters, digits and hyphens. */
export function headingSlug(text) {
  return String(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
}

const emphasis = html => html
  .replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(«"'¿¡])\*(?=\S)([^*]+?)\*(?=$|[\s.,;:!?)»"'])/g, '$1<em>$2</em>');

/** One line of text: code spans, images and links are set aside while the rest is escaped. */
function inline(raw, link) {
  const parts = [];
  const hold = html => `\u0000${parts.push(html) - 1}\u0000`;
  const re = /`([^`]+)`|(!?)\[([^\]]+)\]\(([^)\s]+)(?: "[^"]*")?\)/g;
  let text = '', last = 0, m;
  while ((m = re.exec(raw))) {
    text += esc(raw.slice(last, m.index));
    if (m[1] !== undefined) text += hold(`<code>${esc(m[1])}</code>`);
    else if (m[2]) text += hold(`<img src="${esc(link(m[4]))}" alt="${esc(m[3])}" loading="lazy">`);
    else {
      const href = link(m[4]);
      text += hold(`<a href="${esc(href)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''}>${emphasis(esc(m[3]))}</a>`);
    }
    last = re.lastIndex;
  }
  text += esc(raw.slice(last));
  return emphasis(text).replace(/\u0000(\d+)\u0000/g, (_, i) => parts[i]);
}

const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

const isOrdered = line => /^ *\d/.test(line);

/** The lines of one list, from `start`: items of its kind at its indent and everything nested in them. */
function listBlock(lines, start) {
  const base = indentOf(lines[start]);
  const sameItem = line => indentOf(line) === base && LIST_ITEM.test(line) && isOrdered(line) === isOrdered(lines[start]);
  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (!line.trim()) {
      const next = lines.slice(end + 1).find(l => l.trim());
      if (next === undefined || !(indentOf(next) > base || sameItem(next))) break;
    } else if (indentOf(line) < base || (indentOf(line) === base && !sameItem(line))) break;
    end++;
  }
  return { block: lines.slice(start, end), end };
}

function renderList(block, link) {
  const base = indentOf(block[0]);
  const ordered = /\d/.test(block[0].match(LIST_ITEM)[2]);
  const items = [];
  for (const line of block) {
    const m = indentOf(line) === base && line.match(LIST_ITEM);
    if (m) items.push({ offset: m[1].length + m[2].length + 1, lines: [m[3]] });
    else items.at(-1).lines.push(line.slice(Math.min(indentOf(line), items.at(-1).offset)));
  }
  // The item's first paragraph stays inline, without its <p>, as in a tight list.
  const body = items.map(item => `<li>${renderMarkdown(item.lines.join('\n'), { link }).replace(/^<p>([\s\S]*?)<\/p>\n?/, '$1')}</li>`).join('');
  return ordered ? `<ol>${body}</ol>` : `<ul>${body}</ul>`;
}

/**
 * Markdown text to HTML.
 * @param {string} text
 * @param {{ link?: (href: string) => string }} [options]  how links and images are resolved
 */
export function renderMarkdown(text, { link = href => href } = {}) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const html = [];
  const paragraph = [];
  const flush = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '), link)}</p>`);
    paragraph.length = 0;
  };
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (/^ *```/.test(line)) {
      flush();
      const code = [];
      for (i++; i < lines.length && !/^ *```/.test(lines[i]); i++) code.push(lines[i]);
      html.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      i++;
      continue;
    }
    if (!line.trim()) { flush(); i++; continue; }
    const heading = line.match(/^ {0,3}(#{1,6}) +(.*?) *#* *$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      html.push(`<h${level} id="${esc(headingSlug(heading[2]))}">${inline(heading[2], link)}</h${level}>`);
      i++;
      continue;
    }
    if (/^ {0,3}([-*_])( *\1){2,} *$/.test(line)) { flush(); html.push('<hr>'); i++; continue; }
    if (/^ *\|/.test(line) && TABLE_RULE.test(lines[i + 1] ?? '')) {
      flush();
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && /^ *\|/.test(lines[i]); i++) rows.push(cells(lines[i]));
      html.push(`<div class="doc-table"><table><thead><tr>${head.map(c => `<th scope="col">${inline(c, link)}</th>`).join('')}</tr></thead><tbody>${
        rows.map(r => `<tr>${head.map((_, k) => `<td>${inline(r[k] ?? '', link)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^ *>/.test(line)) {
      flush();
      const quote = [];
      for (; i < lines.length && /^ *>/.test(lines[i]); i++) quote.push(lines[i].replace(/^ *> ?/, ''));
      html.push(`<blockquote>${renderMarkdown(quote.join('\n'), { link })}</blockquote>`);
      continue;
    }
    // A list may follow a paragraph line directly; a numbered one only from «1.».
    const item = line.match(LIST_ITEM);
    if (item && (!paragraph.length || !/\d/.test(item[2]) || /^1[.)]$/.test(item[2]))) {
      flush();
      const { block, end } = listBlock(lines, i);
      html.push(renderList(block, link));
      i = end;
      continue;
    }
    paragraph.push(line.trim());
    i++;
  }
  flush();
  return html.join('\n');
}
