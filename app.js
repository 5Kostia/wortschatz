(async () => {
const $ = s => document.querySelector(s), now = () => Math.floor(Date.now() / 1000);
const E = s => s == null ? '' : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CATS = { art: ['🔤', 'Артикли', 0], noun: ['📘', 'Существительные', 1], verb: ['🏃', 'Глаголы', 1], adj: ['🎨', 'Прилагательные', 0], vp: ['🔗', 'Глаголы с предлогами', 0], phr: ['💬', 'Фразеологизмы', 0] };
const LV = ['A1', 'A2', 'B1', 'B2', 'C1'], SUF = [['schaft', 'die'], ['heit', 'die'], ['keit', 'die'], ['ung', 'die'], ['ion', 'die'], ['tät', 'die'], ['ik', 'die'], ['ur', 'die'], ['ei', 'die'], ['enz', 'die'], ['anz', 'die'], ['chen', 'das'], ['lein', 'das'], ['ment', 'das'], ['ling', 'der'], ['ismus', 'der'], ['ant', 'der'], ['ist', 'der'], ['or', 'der']];
let D, P = {}, ST = { limit: 10, method: 'auto', dir: 'alt', cat: null, level: 'ALL', bk: 0 }, tab = 'home', Q = null, RC = 'all', LAST = null, LS = { cat: 'noun', st: 'L', n: 30 };
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('wortschatz', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const kvGet = async k => { const db = await idb(); return new Promise(r => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(undefined); }); };
const kvSet = async (k, v) => { const db = await idb(); return new Promise(r => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = r; t.onerror = r; }); };
const save = () => { kvSet('progress', P); kvSet('settings', ST); };
try { P = (await kvGet('progress')) || {}; ST = Object.assign(ST, await kvGet('settings')); } catch (e) { }
if (!ST.since) { ST.since = Math.floor(Date.now() / 1000); kvSet('settings', ST); }
D = await (await fetch('words.json')).json();
for (const c in D) D[c].forEach((x, i) => { x.cat = c; x.idx = i; });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
const key = c => c.cat + ':' + c.u, L = window.L, front = L.front;
const startDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() / 1000; };
const todayN = () => Object.values(P).filter(p => p.l >= startDay()).length;
const unseen = (cat, lv) => D[cat].filter(c => !P[key(c)] && (lv === 'ALL' || c.l === lv));
const dueList = pre => Object.keys(P).filter(k => P[k].d <= now() && (!pre || k.startsWith(pre + ':'))).sort((a, b) => P[a].d - P[b].d).map(k => { const [cat, ...u] = k.split(':'); const c = D[cat] && D[cat].find(x => x.u === u.join(':')); return c && { c, k }; }).filter(Boolean);
const cardOf = (cat, idx) => D[cat][idx];
const show = h => { $('#app').innerHTML = h; $('#app').scrollTop = 0; document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === tab)); };
const btn = (a, v, t, cls = '') => `<button class="btn ${cls}" data-a="${a}" data-v="${E(v)}">${t}</button>`;
function reveal(c) {
  let h = c.cat === 'verb' ? `<div class="big">${E(c.d)}</div><div>${E(c.t)}</div><div class="mu">er/sie/es ${E(c.p)} · ${E(c.f)}</div>` :
    c.cat === 'vp' ? `<div class="big">${E(c.d)} ${E(c.pr)} + ${E(c.c)}</div><div>${E(c.t)}</div>` :
      c.a ? `<div class="big">${E(c.a)} ${E(c.d)}</div><div>${E(c.t)}</div>` : `<div class="big">${E(c.d)}</div><div>${E(c.t)}</div>`;
  h += `<div class="mu">Уровень: ${c.l}</div>`;
  if (c.e.length) h += '<h2>📝 Примеры</h2>' + c.e.map(x => `<div class="ex">${E(x[0])}<br><i>${E(x[1])}</i></div>`).join('');
  return h;
}
function hint(c) {
  if (!c.a || (c.cat !== 'art' && c.cat !== 'noun')) return '';
  const w = c.d.toLowerCase(), r = SUF.find(s => w.endsWith(s[0]));
  return r ? `<p class="mu">${r[1] === c.a ? '💡 Окончание -' + r[0] + ' → обычно ' + r[1] : '⚠️ Исключение! Окончание -' + r[0] + ' обычно даёт ' + r[1] + ', а здесь ' + c.a}</p>` : '';
}
// ---------- экраны ----------
function home() {
  const n = dueList().length, standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const old = Object.keys(P).length && now() - Math.max(ST.bk || 0, ST.since || 0) > 7 * 86400;
  show(`<h1>Wortschatz</h1><div class="card"><div>Сегодня новых слов: <b>${todayN()}/${ST.limit}</b></div><div>Ждут повторения: <b>${n}</b></div></div>
  ${btn('tab', 'review', `🔁 Повторить (${n})`, 'p')}${btn('tab', 'learn', '📚 Учить новые слова', 'c')}
  ${old ? '<div class="card">💾 Прошла неделя с последней копии прогресса. Когда будет минутка, открой «Ещё» → «Сохранить копию».</div>' : ''}
  ${standalone ? '' : '<div class="card mu">Чтобы данные не пропали, добавь приложение на экран «Домой»: в Safari нажми «Поделиться» → «На экран “Домой”».</div>'}`);
}
function learnMenu() {
  const cont = ST.cat ? btn('cont', '', `▶️ Продолжить: ${CATS[ST.cat][1]}${CATS[ST.cat][2] && ST.level !== 'ALL' ? ' ' + ST.level : ''}`, 'p') : '';
  show('<h1>Что учим?</h1>' + cont + Object.keys(CATS).map(c => btn('cat', c, `${CATS[c][0]} ${CATS[c][1]} <span class="mu">(осталось ${unseen(c, 'ALL').length})</span>`)).join(''));
}
function levelMenu(cat) {
  show(`<h1>${CATS[cat][0]} ${CATS[cat][1]}</h1><p class="mu">Какой уровень учим?</p>` + LV.map(l => btn('lvl', cat + ':' + l, `${l} <span class="mu">(осталось ${unseen(cat, l).length})</span>`)).join('') + btn('lvl', cat + ':ALL', `Все уровни <span class="mu">(${unseen(cat, 'ALL').length})</span>`) + btn('tab', 'learn', '⬅️ Назад', 'c'));
}
function newCard() {
  tab = 'learn'; if (!ST.cat) return learnMenu();
  if (todayN() >= ST.limit) return show(`<h1>Готово на сегодня ✅</h1><p>Лимит новых слов достигнут (${todayN()}/${ST.limit}). Можно повторить слова или изменить лимит в «Ещё».</p>${btn('tab', 'review', '🔁 Повторить', 'p')}${btn('tab', 'set', '⚙️ Настройки', 'c')}`);
  const pool = unseen(ST.cat, CATS[ST.cat][2] ? ST.level : 'ALL');
  if (!pool.length) return show(`<h1>Здесь всё 🎉</h1><p>В этом разделе новых слов больше нет.</p>${btn('tab', 'learn', '📚 Другой раздел', 'c')}`);
  const c = pool[Math.floor(Math.random() * pool.length)];
  if (c.cat === 'art') return ask(c, 'choice_article', 'learn', 1, null);
  show(`<div class="card"><div class="mu">${CATS[c.cat][1]}</div><div class="big">${E(front(c))}${c.cat === 'vp' ? ' …' : ''}</div><div>${c.cat === 'vp' ? 'Знаешь, какой предлог и падеж?' : c.cat === 'phr' ? 'Знаешь, что это значит?' : 'Знаешь это слово?'}</div></div>
  <div class="row">${btn('know', c.cat + ':' + c.idx + ':y', '✅ Знаю', 'c')}${btn('know', c.cat + ':' + c.idx + ':n', '❌ Не знаю', 'c')}</div>${btn('tab', 'learn', '⬅️ Другой раздел', 'c')}`);
}
function ask(c, type, flow, box, store, dir) {
  const o = type.startsWith('choice') ? L.options(c, type, D[c.cat]) : {};
  Q = { c, type, flow, box, store, dir, opts: o.opts, ok: o.ok, done: false };
  const T = { choice_article: 'Какой артикль?', choice_prep: 'Какой предлог и падеж?', choice_tr: c.cat === 'phr' ? 'Что означает выражение?' : 'Что значит слово?', choice_de: 'Как по-немецки?', type_tr: '✍️ Напиши перевод на русский:', type_de: '✍️ Напиши по-немецки' + (c.cat === 'noun' ? ' (с артиклем)' : '') + ':', type_prep: '✍️ Напиши предлог:' }[type];
  const word = type === 'choice_de' || type === 'type_de' ? E(c.t) : E(c.cat === 'art' ? c.d : front(c)) + (type.endsWith('prep') ? ' …' : '');
  const core = c.d.replace('sich ', '');
  const sub = type === 'type_de' ? `<div class="mu">Подсказка: ${E(core[0])}…, букв: ${core.length}</div>` : '';
  const left = flow === 'review' ? `<div class="mu">Осталось: ${dueList(RC === 'all' ? '' : RC).length}</div>` : '';
  let body = o.opts ? o.opts.map((t, i) => btn('ans', i, E(t))).join('') : `<input type="text" id="ans" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" placeholder="Твой ответ">${btn('send', '', 'Проверить', 'p')}`;
  show(`${left}<div class="card"><div class="mu">${T}</div><div class="big">${word}</div>${sub}</div>${body}${btn('ans', -1, '🤷 Не знаю', 'c')}`);
  const i = $('#ans'); if (i) i.focus();
}
function finish(ok, unknown, given, note) {
  const c = Q.c, k = key(c); Q.done = true; let info;
  if (Q.flow === 'review') {
    const r = L.answer(P, k, ok, now()); if (Q.store) P[k].r = Q.store;
    info = ok ? `⏱ Следующее повторение через ${L.wait(r.delay)}.` : r.nb < r.ob ? `⬇️ Слово вернулось на ступень назад (повтор через ${L.wait(r.delay)}).` : `⏱ Слово остаётся на первой ступени, повтор через ${L.wait(r.delay)}.`;
  } else if (ok) info = `⏱ Слово засчитано как известное. Проверю через ${L.wait(L.addKnown(P, k, L.KNOWN(c.cat), now()))}.`;
  else info = `📌 Добавил слово в изучение. Первое повторение через ${L.wait(L.addLearning(P, k, now()))}.`;
  save();
  const typed = Q.type.startsWith('type'), extra = ok && !typed ? btn('guess', c.cat + ':' + c.idx + ':' + Q.box, '🤔 Угадал, повторить', 'c') : !ok && typed ? btn('over', c.cat + ':' + c.idx + ':' + Q.box, '✅ Засчитать как верный', 'c') : '';
  show(`<div class="card"><h2 class="${ok ? 'ok' : 'bad'}" style="margin-top:0">${ok ? '✅ Верно!' : unknown ? '🤷 Ничего страшного, смотри:' : '❌ Неверно.'}</h2>${note ? `<div class="mu">${E(note)}</div>` : ''}${!ok && given ? `<div>Твой ответ: ${E(given)}</div>` : ''}${reveal(c)}${hint(c)}<p>${info}</p></div>${extra}${btn(Q.flow === 'review' ? 'nextr' : 'nextl', '', 'Дальше ▶️', 'p')}`);
}
function nextReview() {
  tab = 'review'; const all = dueList(RC === 'all' ? '' : RC), pick = all.filter(x => x.c !== LAST) .length ? all.filter(x => x.c !== LAST) : all;
  if (!pick.length) {
    const nx = Object.values(P).filter(p => p.d > now()).map(p => p.d).sort((a, b) => a - b)[0];
    return show(`<h1>${Object.keys(P).length ? 'На сегодня всё повторено ✅' : 'Пока нечего повторять'}</h1><p>${nx ? 'Ближайшее повторение через ' + L.wait(nx - now()) + '.' : 'Начни с «Учить».'}</p>${btn('tab', 'learn', '📚 Учить новые слова', 'p')}`);
  }
  const { c, k } = pick[0]; LAST = c; const [type, dir, rem] = L.plan(c, P[k].b, ST, P[k].r);
  ask(c, type, 'review', P[k].b, rem, dir);
}
function reviewMenu() {
  show('<h1>Что повторяем?</h1>' + btn('rev', 'all', `Все разделы (${dueList().length})`, 'p') + Object.keys(CATS).map(c => dueList(c).length ? btn('rev', c, `${CATS[c][0]} ${CATS[c][1]} (${dueList(c).length})`) : '').join(''));
}
function stats() {
  const rows = Object.keys(CATS).map(c => { const ks = Object.keys(P).filter(k => k.startsWith(c + ':')); if (!ks.length) return ''; const d = ks.filter(k => P[k].b >= L.LEARNED).length, ok = ks.reduce((a, k) => a + P[k].o, 0), tot = ok + ks.reduce((a, k) => a + P[k].f, 0);
    return btn('list', c, `${CATS[c][0]} ${CATS[c][1]}<br><span class="mu">слов ${ks.length} из ${D[c].length} · учу ${ks.length - d} · выучено ${d} · верно ${tot ? Math.round(100 * ok / tot) : 0}%</span>`); }).join('');
  show(`<h1>Слова</h1>${rows || '<p class="mu">Пока пусто. Начни с «Учить».</p>'}`);
}
function list() {
  const c = LS.cat, ks = Object.keys(P).filter(k => k.startsWith(c + ':')).map(k => ({ k, c: D[c].find(x => x.u === k.slice(c.length + 1)), b: P[k].b })).filter(x => x.c);
  const L1 = ks.filter(x => x.b < L.LEARNED), L2 = ks.filter(x => x.b >= L.LEARNED), items = (LS.st === 'D' ? L2 : L1).sort((a, b) => a.c.d.localeCompare(b.c.d));
  show(`<h1>${CATS[c][0]} ${CATS[c][1]}</h1><div>${`<button class="chip ${LS.st === 'L' ? 'on' : ''}" data-a="lst" data-v="L">📖 Учу (${L1.length})</button><button class="chip ${LS.st === 'D' ? 'on' : ''}" data-a="lst" data-v="D">✅ Выучено (${L2.length})</button>`}</div>
  ${items.slice(0, LS.n).map(x => btn('word', c + ':' + x.c.idx, `${E(front(x.c))} <span class="mu">— ${E(x.c.t)}</span>`)).join('') || '<p class="mu">Здесь пока пусто.</p>'}
  ${items.length > LS.n ? btn('more', '', 'Показать ещё', 'c') : ''}${btn('tab', 'stats', '⬅️ Назад', 'c')}`);
}
function settings() {
  const ch = (a, arr, cur) => arr.map(v => `<button class="chip ${v == cur ? 'on' : ''}" data-a="${a}" data-v="${v}">${v}</button>`).join('');
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(o => `<option value="${o[0]}" ${o[0] === cur ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const bk = ST.bk ? new Date(ST.bk * 1000).toLocaleDateString('ru-RU') : 'ещё не было';
  show(`<h1>Настройки</h1><div class="card"><h2 style="margin-top:0">Новых слов в день</h2>${ch('lim', [5, 10, 15, 20, 25, 30, 40, 50], ST.limit)}<input type="number" id="limc" min="1" max="200" placeholder="Своё число, например 6">${btn('limset', '', 'Сохранить число', 'c')}</div>
  <div class="card"><h2 style="margin-top:0">Способ ответов</h2>${sel('meth', [['auto', 'По этапам (сначала варианты, потом ввод)'], ['choice', 'Только варианты'], ['type', 'Только ввод вручную']], ST.method)}
  <h2>Направление вопросов</h2>${sel('dirs', [['alt', 'Чередовать'], ['de_ru', 'Немецкий → русский'], ['ru_de', 'Русский → немецкий']], ST.dir)}</div>
  <div class="card"><h2 style="margin-top:0">Копия прогресса</h2><p class="mu">Данные хранятся только на этом телефоне. Последняя копия: <span id="bkd">${bk}</span>.</p>${btn('bk', 'dl', '💾 Скачать файл', 'c')}${btn('bk', 'share', '📤 Поделиться файлом', 'c')}${btn('bk', 'copy', '📋 Скопировать текст', 'c')}<div id="bkm" class="mu"></div>
  <h2>Загрузить копию</h2>${btn('imp', '', '📂 Выбрать файл', 'c')}${btn('impclip', '', '📋 Вставить из буфера', 'c')}</div>
  <p class="mu" id="dbg" style="text-align:center;font-size:12px">Версия 0.1.7</p>`);
  dbgFill();
}
function dbgFill() {
  const mk = css => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;width:1px;visibility:hidden;pointer-events:none;' + css; document.body.appendChild(d); return d; };
  const a = mk('top:0;height:100vh;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'), b = mk('bottom:0;height:0'), c = mk('top:0;height:100dvh'), d = mk('top:0;height:100lvh');
  const cs = getComputedStyle(a), vv = window.visualViewport;
  const t = `inner ${innerHeight} | screen ${screen.height} | vv ${vv ? Math.round(vv.height) : '-'} | vh ${a.offsetHeight} | dvh ${c.offsetHeight} | lvh ${d.offsetHeight} | fixed-bottom ${Math.round(b.getBoundingClientRect().bottom)} | body ${Math.round(document.body.getBoundingClientRect().height)} | nav-bottom ${Math.round(document.querySelector('nav').getBoundingClientRect().bottom)} | env ${cs.paddingTop}/${cs.paddingBottom} | standalone ${navigator.standalone}`;
  [a, b, c, d].forEach(x => x.remove());
  const el = document.getElementById('dbg'); if (el) el.innerHTML += '<br>' + t;
}

// ---------- действия ----------
function go(t) { tab = t; LAST = null; ({ home, learn: learnMenu, review: reviewMenu, stats, set: settings }[t] || home)(); }
const bkName = () => 'wortschatz-kopie-' + new Date().toISOString().slice(0, 10) + '.json';
function bkMsg(t, ok) {
  const m = $('#bkm'); if (m) { m.className = ok ? 'ok' : 'bad'; m.textContent = t; }
  if (ok) { ST.bk = now(); save(); const d = $('#bkd'); if (d) d.textContent = new Date().toLocaleDateString('ru-RU'); }
}
async function bk(kind) {
  const text = JSON.stringify({ v: 1, P, ST }), name = bkName();
  try {
    if (kind === 'dl') {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
      bkMsg('Файл «' + name + '» скачан. Ищи его в папке «Загрузки» (приложение «Файлы»). Если там его нет, нажми «Скопировать текст».', true);
    } else if (kind === 'share') {
      const f = new File([text], name, { type: 'text/plain' });
      if (!(navigator.canShare && navigator.canShare({ files: [f] }))) return bkMsg('Это устройство не умеет делиться файлом. Попробуй «Скачать файл» или «Скопировать текст».', false);
      await navigator.share({ files: [f], title: 'Копия Wortschatz' }); bkMsg('Копия отправлена ✅', true);
    } else { await navigator.clipboard.writeText(text); bkMsg('Текст копии скопирован ✅ Вставь его в заметки или в сообщение себе и сохрани там.', true); }
  } catch (e) { bkMsg(e && e.name === 'AbortError' ? 'Отменено.' : 'Не получилось (' + ((e && e.name) || 'ошибка') + '). Попробуй другой способ.', false); }
}
function applyImport(t) {
  try { const d = JSON.parse(t); if (!d.P) throw 0; if (confirm('Загрузить копию? Текущий прогресс на этом телефоне будет заменён.')) { P = d.P; ST = Object.assign(ST, d.ST); ST.bk = now(); save(); alert('Готово ✅'); go('home'); } } catch (x) { alert('Не получилось прочитать копию: это не файл и не текст копии Wortschatz.'); }
}
async function impClip() {
  let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) { t = prompt('Вставь сюда текст копии:') || ''; }
  if (t) applyImport(t);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (a === 'tab') go(v);
  else if (a === 'cat') { if (CATS[v][2]) levelMenu(v); else { ST.cat = v; ST.level = 'ALL'; save(); newCard(); } }
  else if (a === 'lvl') { const [c, l] = v.split(':'); ST.cat = c; ST.level = l; save(); newCard(); }
  else if (a === 'cont') newCard();
  else if (a === 'rev') { RC = v; LAST = null; nextReview(); }
  else if (a === 'know') { const [c, i, y] = v.split(':'), card = cardOf(c, +i); if (P[key(card)]) return newCard();
    if (y === 'n') { Q = { c: card, flow: 'learn', box: 1, type: 'x' }; const d = L.addLearning(P, key(card), now()); save(); show(`<div class="card">${reveal(card)}${hint(card)}<p>📌 Слово добавлено в изучение. Первое повторение через ${L.wait(d)}.</p></div>${btn('nextl', '', 'Дальше ▶️', 'p')}`); }
    else ask(card, c === 'vp' ? 'choice_prep' : 'choice_tr', 'learn', 1, null); }
  else if (a === 'ans') { if (!Q || Q.done) return go('home'); const i = +v; finish(i !== -1 && i === Q.ok, i === -1, i >= 0 && Q.opts ? Q.opts[i] : '', ''); }
  else if (a === 'send') sendAns();
  else if (a === 'nextl') newCard(); else if (a === 'nextr') nextReview();
  else if (a === 'guess') { const [c, i, bx] = v.split(':'), card = cardOf(c, +i), d = L.guess(P, key(card), +bx, now()); save(); show(`<div class="card">${reveal(card)}<p>🔁 Окей, слово вернулось на ступень назад, повтор через ${L.wait(d)}.</p></div>${btn(Q && Q.flow === 'review' ? 'nextr' : 'nextl', '', 'Дальше ▶️', 'p')}`); }
  else if (a === 'over') { const [c, i, bx] = v.split(':'), card = cardOf(c, +i), d = L.override(P, key(card), +bx, now()); save(); show(`<div class="card">${reveal(card)}<p>✅ Засчитал как верный. Следующее повторение через ${L.wait(d)}.</p></div>${btn('nextr', '', 'Дальше ▶️', 'p')}`); }
  else if (a === 'list') { LS = { cat: v, st: 'L', n: 30 }; list(); }
  else if (a === 'lst') { LS.st = v; LS.n = 30; list(); } else if (a === 'more') { LS.n += 30; list(); }
  else if (a === 'word') { const [c, i] = v.split(':'), card = cardOf(c, +i), p = P[key(card)], w = p.d - now(); show(`<div class="card">${reveal(card)}<p class="mu">Ступень ${p.b} из 6, ${w <= 0 ? 'можно повторять уже сейчас' : 'повтор через ' + L.wait(w)}</p></div>${btn('back', v, '🔁 Вернуть на повтор', 'p')}${btn('list', c, '⬅️ К списку', 'c')}`); }
  else if (a === 'back') { const [c, i] = v.split(':'), card = cardOf(c, +i); L.giveBack(P, key(card), now()); save(); show(`<div class="card">${reveal(card)}<p>🔁 Слово вернулось на повтор: оно уже ждёт в разделе «Повторить».</p></div>${btn('list', c, '⬅️ К списку', 'c')}`); }
  else if (a === 'lim') { ST.limit = +v; save(); settings(); }
  else if (a === 'limset') { const n = Math.round(+$('#limc').value); if (n >= 1 && n <= 200) { ST.limit = n; save(); } settings(); }
  else if (a === 'bk') bk(v); else if (a === 'imp') $('#imp').click(); else if (a === 'impclip') impClip();
});
function sendAns() {
  if (!Q || Q.done) return; const t = $('#ans').value.trim(); if (!t) return; let r;
  if (Q.type === 'type_tr') r = L.checkRu(t, Q.c.t); else if (Q.type === 'type_de') r = L.checkDe(t, Q.c); else r = L.checkPrep(t, Q.c);
  finish(r[0], false, t, r[1]);
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ans') sendAns(); });
document.addEventListener('change', e => {
  if (e.target.id === 'meth') { ST.method = e.target.value; save(); } else if (e.target.id === 'dirs') { ST.dir = e.target.value; save(); }
  else if (e.target.id === 'imp' && e.target.files[0]) { e.target.files[0].text().then(applyImport); e.target.value = ''; }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
go('home');
})();
