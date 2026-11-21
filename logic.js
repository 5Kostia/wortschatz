(function (root) {
  const INT = [0, 900, 28800, 86400, 259200, 604800, 2419200]; // ступени 1-6
  const DAY = 86400, LEARNED = 5;
  const norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  function ratio(a, b) {
    const m = a.length, n = b.length; if (!m || !n) return 0;
    let p = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return 1 - p[n] / Math.max(m, n);
  }
  function alts(tr) {
    const s = new Set(), np = tr.replace(/\([^)]*\)/g, '');
    for (const x of [tr, np]) { s.add(norm(x)); x.split(/[;,]/).forEach(p => s.add(norm(p))); }
    s.delete(''); return s;
  }
  function checkRu(ans, tr) {
    const A = alts(tr), pieces = new Set([norm(ans), ...ans.split(/[;,]/).map(norm)]); pieces.delete('');
    for (const p of pieces) if (A.has(p)) return [true, ''];
    for (const p of pieces) for (const a of A) if (a.length >= 5 && ratio(p, a) >= 0.86) return [true, 'почти точно, правильно: ' + a];
    return [false, ''];
  }
  const nd = s => s.toLowerCase().trim().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ');
  function checkDe(ans, c) {
    let g = nd(ans).replace(/^sich /, ''), e = nd(c.d).replace(/^sich /, ''), art = null;
    const t = g.split(' ');
    if (c.cat === 'noun' && ['der', 'die', 'das'].includes(t[0])) { art = t[0]; g = t.slice(1).join(' '); }
    const exact = g === e, close = !exact && e.length >= 5 && ratio(g, e) >= 0.9;
    if (!exact && !close) return [false, ''];
    let note = exact ? '' : 'почти точно, правильно: ' + c.d;
    if (c.cat === 'noun') {
      if (!art) note = (note ? note + '; ' : '') + 'не забывай артикль: ' + c.a;
      else if (art !== c.a) return [false, 'слово верное, но артикль ' + c.a + ', а не ' + art];
    }
    return [true, note];
  }
  function checkPrep(ans, c) {
    const t = nd(ans.replace('+', ' ')).split(' ').filter(Boolean);
    if (!t.length || t[0] !== nd(c.pr)) return [false, ''];
    const cs = { akk: 'Akk', akkusativ: 'Akk', dat: 'Dat', dativ: 'Dat' }[t[1]];
    if (cs && cs !== c.c) return [false, 'предлог верный, но падеж ' + c.c];
    return [true, ''];
  }
  const front = c => c.cat === 'noun' ? c.a + ' ' + c.d : c.d;
  const KNOWN = cat => cat === 'art' ? 4 : 5;
  function plan(c, box, st, last) { // -> [тип, направление, запомнить направление]
    if (c.cat === 'art') return ['choice_article', 'de_ru', null];
    let m = st.method; const early = m === 'auto' && box <= 2;
    if (m === 'auto') m = early ? 'choice' : 'type';
    if (c.cat === 'vp') return [m === 'choice' ? 'choice_prep' : 'type_prep', 'de_ru', null];
    let dir, rem;
    if (early) { dir = 'de_ru'; rem = null; }
    else { dir = st.dir === 'alt' ? (last === 'de_ru' ? 'ru_de' : 'de_ru') : st.dir; rem = dir; }
    const type = m === 'choice' ? (dir === 'de_ru' ? 'choice_tr' : 'choice_de') : c.cat === 'phr' ? 'choice_' + (dir === 'de_ru' ? 'tr' : 'de') : (dir === 'de_ru' ? 'type_tr' : 'type_de');
    return [type, dir, rem];
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function distract(c, pool) {
    let p = pool;
    if (c.cat === 'noun' || c.cat === 'verb') { const s = pool.filter(x => x.l === c.l); if (s.length >= 30) p = s; }
    const ca = alts(c.t), used = new Set(), out = [];
    for (const o of shuffle(p.filter(x => x !== c))) {
      const a = alts(o.t); if ([...a].some(x => ca.has(x) || used.has(x))) continue;
      out.push(o); a.forEach(x => used.add(x)); if (out.length === 3) break;
    }
    return out;
  }
  function options(c, type, pool) { // -> {opts, ok}
    let o, r;
    if (type === 'choice_article') { o = ['der', 'die', 'das']; r = c.a; }
    else if (type === 'choice_prep') {
      r = c.pr + ' + ' + c.c; const oc = c.c === 'Akk' ? 'Dat' : 'Akk';
      const all = [...new Set(pool.map(x => x.pr + ' + ' + x.c))].filter(x => x !== r && x !== c.pr + ' + ' + oc);
      o = [r, c.pr + ' + ' + oc, ...shuffle(all).slice(0, 2)];
    } else if (type === 'choice_tr') { r = c.t; o = [r, ...distract(c, pool).map(x => x.t)]; }
    else { r = front(c); o = [r, ...distract(c, pool).map(x => front(x))]; }
    o = shuffle(o); return { opts: o, ok: o.indexOf(r) };
  }
  // ---- прогресс: P[ключ] = {b: ступень, d: срок (сек), o: верно, f: неверно, l: когда начали учить, r: направление}
  const addLearning = (P, k, now) => { const p = P[k] || { o: 0, f: 0 }; Object.assign(p, { b: 1, d: now + INT[1], l: now }); P[k] = p; return INT[1]; };
  const addKnown = (P, k, box, now) => { const p = P[k] || { o: 0, f: 0 }; p.b = box; p.d = now + INT[box]; p.o++; P[k] = p; return INT[box]; };
  function answer(P, k, ok, now) {
    const p = P[k], old = p.b, nb = ok ? Math.min(old + 1, 6) : Math.max(old - 1, 1);
    p.b = nb; p.d = now + INT[nb]; ok ? p.o++ : p.f++; return { delay: INT[nb], nb, ob: old };
  }
  function guess(P, k, prev, now) { const p = P[k], nb = Math.max(prev - 1, 1); p.o = Math.max(p.o - 1, 0); p.f++; p.b = nb; p.d = now + INT[nb]; return INT[nb]; }
  function override(P, k, prev, now) { const p = P[k], nb = Math.min(prev + 1, 6); p.o++; p.f = Math.max(p.f - 1, 0); p.b = nb; p.d = now + INT[nb]; return INT[nb]; }
  const giveBack = (P, k, now) => { P[k].b = 1; P[k].d = now; };
  const wait = s => { const m = Math.max(1, Math.floor(s / 60)); return m < 60 ? m + ' мин' : m < 1440 ? Math.floor(m / 60) + ' ч' : Math.floor(m / 1440) + ' дн'; };
  root.L = { INT, DAY, LEARNED, checkRu, checkDe, checkPrep, front, KNOWN, plan, options, addLearning, addKnown, answer, guess, override, giveBack, wait, alts, ratio };
  if (typeof module !== 'undefined') module.exports = root.L;
})(typeof window !== 'undefined' ? window : globalThis);
