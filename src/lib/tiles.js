// Tile renderers ported from the reference design (docs/reference/portfolio-v3-forest.html, object `T`).
// They return HTML strings that Astro renders at build time with set:html, so the output is static HTML.
// The only change from the reference: photo URLs are base-aware and use WebP (540/1080) with a JPEG fallback.
import { url } from './url.js';
import { ALT } from '../data/images.js';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = (s = '') => String(s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

export const v = (k) => (!k ? 'transparent' : k[0] === '#' || k.startsWith('rgb') || k.startsWith('var') ? k : `var(--${k})`);

/** CSS background for a photo: JPEG first (fallback), then image-set with WebP 1x/2x. */
export const pic = (s) => {
  const jpg = url(`images/${s}.jpg`);
  const w5 = url(`images/${s}-540.webp`);
  const w10 = url(`images/${s}-1080.webp`);
  return `background-image:url(${jpg});background-image:image-set(url(${w5}) type('image/webp') 1x, url(${w10}) type('image/webp') 2x, url(${jpg}) type('image/jpeg') 1x)`;
};

/** Accessible name for photo tiles: role="img" when the tile has no text, otherwise a visually hidden description. */
const photoA11y = (src, hasText) => (hasText ? { attr: '', sr: `<span class="sr-only">Photo: ${esc(ALT[src] || '')}</span>` } : { attr: ` role="img" aria-label="${esc(ALT[src] || '')}"`, sr: '' });

export const T = {
  pic: (o) => {
    const hasText = !!(o.title || o.tag || o.cap || o.hand || o.k);
    const a = photoA11y(o.src, hasText);
    return `<div class="t photo"${a.attr} style="${pic(o.src)};background-position:${o.pos || 'center'}">${a.sr}${o.shade === false ? '' : '<span class="pshade"></span>'}${o.title ? `<span class="ov ${o.at || ''}" style="color:${v(o.tc || '#fff')};--fs:${o.fs || '10cqi'}">${o.k ? `<span class="k">${o.k}</span>` : ''}<span class="big">${o.title}</span></span>` : ''}${o.tag ? `<span class="tag" style="background:${v(o.tagbg || 'bg')};color:${v(o.tagc || 'ink')}">${o.tag}</span>` : ''}${o.cap ? `<span class="cap" style="color:${v(o.capc || '#fff')}">${o.cap}</span>` : ''}${o.hand ? `<span class="hand" style="color:${v(o.handc || '#fff')}">${o.hand}</span>` : ''}${o.tape ? '<span class="tape"></span>' : ''}${o.play ? '<span class="play"></span>' : ''}</div>`;
  },
  reel: (o) => `<div class="t photo" style="${pic(o.src)}"><span class="sr-only">Reel cover. Photo: ${esc(ALT[o.src] || '')}</span><span class="pshade"></span><span class="play"></span><span class="hook" style="--hl:${v(o.hl || 'bg')};color:${v(o.hc || 'ink')}"><span>${o.hook}</span></span></div>`,
  person: (o) => `<div class="t photo" style="${pic(o.src)};background-position:center 25%"><span class="sr-only">Photo: ${esc(ALT[o.src] || '')}</span><span class="nametag" style="background:${v(o.nb || 'bg')};color:${v(o.nc || 'ink')}"><b>${o.name}</b>${o.role}</span></div>`,
  ugc: (o) => `<div class="t photo" style="${pic(o.src)}"><span class="sr-only">Photo: ${esc(ALT[o.src] || '')}</span><span class="stk">${o.text}</span><span class="ugch">${o.handle}</span></div>`,
  video: (o) => `<div class="t photo" style="${pic(o.src)};background-position:center 20%"><span class="sr-only">Video cover. Photo: ${esc(ALT[o.src] || '')}</span><span class="rec">${o.dur}</span>${o.k ? `<span class="vk" style="background:${v(o.kb)};color:${v(o.kc)}">${o.k}</span>` : ''}<span class="subt">${o.sub}</span></div>`,
  type: (o) => `<div class="t t-type" style="background:${v(o.bg)};color:${v(o.fg)};--fs:${o.fs || '13cqi'}">${o.k ? `<span class="k" style="color:${v(o.kc || o.fg)}">${o.k}</span>` : ''}<span class="big">${o.text}</span>${o.sub ? `<span class="sub">${o.sub}</span>` : ''}${o.chip ? `<span class="chipx" style="background:${v(o.chipbg || 'acc')};color:${v(o.chipc || 'ink')}">${o.chip}</span>` : ''}${o.h ? `<span class="h">${o.h}</span>` : ''}</div>`,
  quote: (o) => `<div class="t t-quote" style="background:${v(o.bg)};color:${v(o.fg)}"><span class="qm" style="color:${v(o.acc)}" aria-hidden="true">&ldquo;</span><span class="qt">${o.text}</span>${o.stars === false ? '' : `<span class="stars" style="color:${v(o.acc)}" role="img" aria-label="Five stars">★★★★★</span>`}<span class="by">${o.by || 'Sample review'}</span></div>`,
  list: (o) => `<div class="t t-list" style="background:${v(o.bg)};color:${v(o.fg)}">${o.k ? `<span class="k" style="color:${v(o.acc)}">${o.k}</span>` : ''}<span class="lt2">${o.title}</span><ol class="${o.num ? 'num' : ''}" style="--a:${v(o.acc)}">${o.items.map((i) => `<li><span>${i}</span></li>`).join('')}</ol>${o.h ? `<span class="h">${o.h}</span>` : ''}</div>`,
  series: (o) => `<div class="t t-series" style="background:${v(o.bg)};color:${v(o.fg)}"><span class="sn">${o.name}</span><span class="ep" style="color:${v(o.acc)}">${o.ep}</span><span class="st">${o.title}</span><span class="h">${o.h || 'New every week'}</span></div>`,
  swatch: (o) => `<div class="t t-swatch" style="background:${v(o.bg)};color:${v(o.fg)}"><span class="k">${o.k}</span><span class="lt2">${o.title}</span><div class="sw">${o.sw.map((s) => `<span><i style="background:${v(s.c)}"></i>${s.n}</span>`).join('')}</div></div>`,
  myth: (o) => `<div class="t t-myth" style="background:${v(o.bg)};color:${v(o.fg)}"><div class="mb"><span class="ml">Myth</span><span>${o.myth}</span></div><div class="mb f" style="background:${v(o.fb)};color:${v(o.fc)}"><span class="ml">Fact</span><span>${o.fact}</span></div>${o.h ? `<span class="h">${o.h}</span>` : ''}</div>`,
  step: (o) => `<div class="t t-step" style="background:${v(o.bg)};color:${v(o.fg)};--ns:${o.ns || '22cqi'}"><span class="sn2" style="color:${v(o.acc)}">${o.num}</span><span class="stt">${o.title}</span><span class="stb">${o.body}</span><span class="foot2"><span>${o.brand || ''}</span><span>${o.pg || ''}</span></span></div>`,
  cta: (o) => `<div class="t t-cta" style="background:${v(o.bg)};color:${v(o.fg)};--fs:${o.fs || '12cqi'}"><span class="big">${o.title}</span><span class="btnx" style="background:${v(o.acc)};color:${v(o.bc || 'ink')}">${o.btn}</span>${o.sub ? `<span class="h">${o.sub}</span>` : ''}</div>`,
  sheet: (o) => `<div class="t t-sheet"><div class="sh-bar" aria-hidden="true"><i></i><i></i><i></i><span>${o.file}</span></div><div class="sh-wrap"><table><thead><tr>${o.rows[0].map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${o.rows.slice(1).map((r) => `<tr>${r.map((c, i) => `<td class="${i === o.hlcol ? 'hl' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><span class="hand" style="color:${o.hc}">${o.note}</span></div>`,
  review: (o) => `<div class="t t-review" style="background:${v(o.bg)};color:${v(o.kc || 'ink')}">${o.k ? `<span class="k">${o.k}</span>` : ''}<div class="rv"><div class="rvh"><span class="av" style="background:var(--ink);color:var(--bg)" aria-hidden="true">${o.ini}</span><div><b>${o.name}</b><span>recommends ${o.brand}</span></div></div><p>${o.text}</p><div class="rvf">Sample review · ${o.when}</div></div></div>`,
  html: (o) => `<div class="t t-html" style="background:${v(o.bg)};color:${v(o.fg || 'ink')}">${o.html}</div>`,
  nl: (o) => `<div class="t t-nl" style="background:${v(o.bg)};color:${v(o.fg)}"><span class="k" style="color:${v(o.kc || o.fg)}">${o.k}</span><span class="lt2">${o.title}</span>${o.blocks.map((b) => `<div class="nlb"><span class="nln" style="background:${v(o.acc)}">${b.n}</span><div><b>${b.h}</b><ul>${b.items.map((i) => `<li>${i}</li>`).join('')}</ul></div></div>`).join('')}</div>`,
};

export const R = (o) => T[o.t](o);

const ICONS = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/></svg>`;

export function frame(c, b) {
  if (c.kind === 'reel') return `<div class="phone">${R(c.tile)}<span class="shade"></span><div class="ui">${ICONS}</div><div class="pc"><b>${b.handle}</b>${c.caption}<small>♪ Original audio · ${b.name}</small></div></div>`;
  if (c.kind === 'car') return `<div class="car" role="group" tabindex="0" aria-label="${esc(strip(c.title))}, carousel of ${c.slides.length} slides. Scroll sideways.">${c.slides.map((s) => `<div class="slide">${R(s)}</div>`).join('')}</div>`;
  if (c.kind === 'li') return `<div class="lip"><div class="lih"><span class="av" style="${c.avsrc ? pic(c.avsrc) : 'background:var(--ink);color:var(--bg)'}" aria-hidden="true">${c.avsrc ? '' : c.ini}</span><div><b>${c.who}</b><span>${c.role}</span></div></div><div class="lit">${c.text}</div><div style="--ar:${c.ar || '4/5'}">${R(c.img)}</div><div class="lir" aria-hidden="true"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div></div>`;
  return `<div class="single" style="--ar:${c.ar || '4/5'}">${R(c.tile)}</div>`;
}

export const varStyle = (b) => Object.entries(b.vars).map(([k, val]) => `--${k}:${val}`).join(';') + `;--lbg:var(--${b.lbg});--lfg:var(--${b.lfg})`;

const H = (n, cls, html) => `<h${n} class="${cls}">${html}</h${n}>`;

/** Identity board: logo & tagline, palette, typography, voice. `lv` = heading level for the card labels. */
export function idBoard(b, lv = 4) {
  const pal = b.palette.map((p) => `<div class="pal"><i style="background:${p.h}"></i><span>${p.n}</span><code>${p.h}</code></div>`).join('');
  return `<div class="idb">
    <div class="idc id-logo">${H(lv, 'lbl', 'Logo &amp; tagline')}<div>${b.logo}</div><div class="tagl">${b.tagline}</div></div>
    <div class="idc">${H(lv, 'lbl', 'Palette')}${pal}</div>
    <div class="idc">${H(lv, 'lbl', 'Typography')}<div class="ty-d" aria-hidden="true">Aa</div><span class="ty-n">${b.fdn} · headlines</span><p class="ty-b">${b.sample}</p><span class="ty-n">${b.fbn} · body</span></div>
    <div class="idc">${H(lv, 'lbl', 'Voice')}<div class="vw">${b.voice.map((w) => `<span>${w}</span>`).join('')}</div><div class="say"><b>We say</b><p>“${b.say}”</p></div><div class="say no"><b>We don't say</b><p>“${b.nosay}”</p></div></div>
  </div>`;
}

/** Instagram profile mock + feed plan. */
export function feed(b, lv = 4, siteHref = '#') {
  return `<div class="feedrow">
    <figure class="igm" aria-label="Instagram profile mock-up for ${esc(b.name)}">
      <div class="igh">${b.avatar ? `<span class="iga iga-logo" aria-hidden="true">${b.avatar}</span>` : `<span class="iga" style="background:var(--ink);color:var(--bg);font-family:var(--fd);font-weight:var(--fw)" aria-hidden="true">${b.mark}</span>`}
        <div class="ign"><b>${b.handle}</b><span class="igb">Follow</span><span class="igb s">Message</span></div></div>
      <div class="igbio"><b>${b.name}</b><span class="igc">${b.cat}</span><p>${b.bio}</p><a href="${siteHref}">${b.site}</a></div>
      <div class="ighl" aria-hidden="true">${b.hl.map((h, i) => `<span><i style="${b.hlc ? `background:${v(b.hlc[i])}` : pic(b.hli[i])}"></i>${h}</span>`).join('')}</div>
      <div class="igtabs" aria-hidden="true"><span class="on">Posts</span><span>Reels</span><span>Tagged</span></div>
      <div class="iggrid">${b.grid.map(R).join('')}</div>
    </figure>
    <div class="fplan">
      ${H(lv, 'lbl', 'Content pillars')}
      <ul class="pil">${b.pillars.map((p) => `<li><i style="background:${v(p.c)}"></i><div><b>${p.n}</b><span>${p.d}</span></div></li>`).join('')}</ul>
      ${H(lv, 'lbl', 'Grid logic')}<p>${b.gridNote}</p>
      ${H(lv, 'lbl', 'Sample caption · written for search')}<div class="capbox">${b.caption}</div>
      ${H(lv, 'lbl', 'Alt text')}<p class="alt">${b.alt}</p>
      <p class="spec-note">Grid previews at 3:4. Posts are designed at 1080×1350 with key content in the centre.</p>
    </div>
  </div>`;
}

/** Trend-led creatives. `lt` = heading level of "Trend-led creatives", `li` = level of each creative title. */
export function creatives(b, lt = 4, li = 5) {
  return `<div class="crt">${H(lt, 'ttl', 'Trend-led <em>creatives</em>')}<span class="spec-note">Swipe the carousels sideways</span></div>
  <div class="crs">${b.creatives.map((c) => `<article class="cr ${c.kind === 'car' ? 'wide' : ''} ${c.kind === 'li' ? 'li' : ''}"><span class="trendchip">${c.trend}</span>${H(li, 'ttl', c.title)}<div class="crb">${frame(c, b)}</div><p class="why">${c.why}</p><p class="spec">${c.spec}</p></article>`).join('')}</div>`;
}

/** Full brand panel for the home page tabs (matches the reference panel()). */
export function panel(b, caseHref, cta = 'View case study', hidden = false) {
  return `<div class="panel" id="panel-${b.id}" role="tabpanel" aria-labelledby="tab-${b.id}" tabindex="0" style="${varStyle(b)}"${hidden ? ' hidden' : ''}>
    <div class="bhead"><div><span class="eyebrow">${b.catLong}</span><h3>${b.name}</h3><div class="chan">${b.chan}</div></div><div class="bhead-r"><p>${b.about}</p><a class="btn ghost sm" href="${caseHref}">${cta}<span class="sr-only">: ${esc(b.name)}</span> <span aria-hidden="true">→</span></a></div></div>
    ${idBoard(b, 4)}
    ${feed(b, 4, caseHref)}
    ${creatives(b, 4, 5)}
  </div>`;
}

export const tabButton = (b, selected) => `<button class="bt" role="tab" type="button" id="tab-${b.id}" data-id="${b.id}" aria-controls="panel-${b.id}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}"><span class="bm" style="${varStyle(b)};background:var(--ink);color:var(--bg);font-family:var(--fd);font-weight:var(--fw)" aria-hidden="true">${b.mark}</span><span><b>${b.name}</b><small>${b.cat}</small></span></button>`;

export const brandMark = (b, cls = 'bm') => (b.avatar
  ? `<span class="${cls} bm-logo" style="${varStyle(b)}" aria-hidden="true">${b.avatar}</span>`
  : `<span class="${cls}" style="${varStyle(b)};background:var(--ink);color:var(--bg);font-family:var(--fd);font-weight:var(--fw)" aria-hidden="true">${b.mark}</span>`);
