/* Asistente Smart Pools: widget de chat que consulta /api/chat (Claude en el servidor).
   Independiente del resto del sitio. */
(function () {
  'use strict';
  var WA = '56976146262';
  var GREET = '¡Hola! 👋 Soy el asistente de Smart Pools. Puedo resolver tus dudas y armarte una cotización al instante. ¿En qué te ayudo?';
  var CHIPS = ['¿Cuánto cuesta una piscina?', '¿Cabe en mi patio?', '¿Cuánto demora la instalación?'];
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // texto plano -> HTML seguro con saltos de línea, viñetas y **negritas**
  function fmt(t) {
    var lines = esc(t).split('\n'), html = '', inUl = false;
    lines.forEach(function (ln) {
      ln = ln.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      var mli = ln.match(/^\s*[-•]\s+(.*)$/);
      if (mli) { if (!inUl) { html += '<ul>'; inUl = true; } html += '<li>' + mli[1] + '</li>'; }
      else { if (inUl) { html += '</ul>'; inUl = false; } if (ln.trim()) html += '<p>' + ln + '</p>'; }
    });
    if (inUl) html += '</ul>';
    return html;
  }

  var msgs = [];           // historial {role, content} para la API
  var open = false, busy = false, launcher, panel, log, input, sendBtn;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function build() {
    launcher = el('button', 'spa-launch');
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Abrir el asistente');
    launcher.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><circle cx="9" cy="11" r="1.1"/><circle cx="13" cy="11" r="1.1"/><circle cx="17" cy="11" r="1.1"/></svg><span>Asistente</span>';
    launcher.addEventListener('click', toggle);

    panel = el('section', 'spa-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Asistente de Smart Pools');
    panel.setAttribute('aria-modal', 'false');
    panel.hidden = true;
    panel.innerHTML =
      '<header class="spa-head"><span class="spa-dot" aria-hidden="true"></span>' +
      '<div><b>Asistente Smart Pools</b><small>Responde al instante · cotiza tu piscina</small></div>' +
      '<button type="button" class="spa-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>' +
      '<div class="spa-log" aria-live="polite"></div>' +
      '<form class="spa-form"><input type="text" class="spa-input" autocomplete="off" placeholder="Escribe tu mensaje…" aria-label="Mensaje" maxlength="500">' +
      '<button type="submit" class="spa-send" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6-7-2z"/></svg></button></form>' +
      '<p class="spa-foot">Cotización referencial con IVA. Para cerrar, <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">WhatsApp</a>.</p>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);
    log = panel.querySelector('.spa-log');
    input = panel.querySelector('.spa-input');
    sendBtn = panel.querySelector('.spa-send');
    panel.querySelector('.spa-x').addEventListener('click', toggle);
    panel.querySelector('.spa-form').addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(); });
  }

  function toggle() {
    open = !open; panel.hidden = !open;
    launcher.classList.toggle('is-open', open);
    launcher.setAttribute('aria-label', open ? 'Cerrar el asistente' : 'Abrir el asistente');
    if (open) {
      if (!log.childElementCount) { addBot(GREET); addChips(); }
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  function row(who) { var r = el('div', 'spa-msg spa-' + who); log.appendChild(r); log.scrollTop = log.scrollHeight; return r; }
  function addBot(t) { var r = row('bot'); r.innerHTML = fmt(t); log.scrollTop = log.scrollHeight; return r; }
  function addUser(t) { var r = row('user'); r.textContent = t; log.scrollTop = log.scrollHeight; }
  function addChips() {
    var w = el('div', 'spa-chips');
    CHIPS.forEach(function (c) { var b = el('button', null, esc(c)); b.type = 'button'; b.addEventListener('click', function () { send(c); }); w.appendChild(b); });
    log.appendChild(w); log.scrollTop = log.scrollHeight;
  }
  function quoteCard(q) {
    if (!q || !q.lineas) return;
    var rows = q.lineas.map(function (x) {
      var v = typeof x.valor === 'number' ? (x.desde ? 'desde ' : '') + '$' + x.valor.toLocaleString('es-CL') : (x.pendiente || '');
      return '<li><span>' + esc(x.label) + '</span><b>' + esc(v) + '</b></li>';
    }).join('');
    var waTxt = 'Hola, vengo del sitio con esta cotización:\n' + q.resumen_texto;
    var c = el('div', 'spa-quote',
      '<p class="spa-quote__h">Cotización referencial</p><ul>' + rows +
      '</ul><p class="spa-quote__t"><span>Total</span><b>' + esc(q.total_texto) + '</b></p>' +
      '<a class="spa-quote__wa" target="_blank" rel="noopener" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(waTxt) + '">Continuar por WhatsApp</a>');
    log.appendChild(c); log.scrollTop = log.scrollHeight;
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    var chips = log.querySelector('.spa-chips'); if (chips) chips.remove();
    addUser(text); input.value = '';
    msgs.push({ role: 'user', content: text });
    busy = true; sendBtn.disabled = true;
    var typing = row('bot'); typing.className += ' spa-typing'; typing.innerHTML = '<span></span><span></span><span></span>';
    fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: msgs.slice(-24) }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        typing.remove();
        var reply = (d && d.reply) || 'No pude responder. Escríbenos por WhatsApp.';
        addBot(reply); if (d && d.quote) quoteCard(d.quote);
        msgs.push({ role: 'assistant', content: reply });
      })
      .catch(function () { typing.remove(); addBot('Tuvimos un problema de conexión. Inténtalo de nuevo o escríbenos por WhatsApp al +56 9 7614 6262.'); })
      .then(function () { busy = false; sendBtn.disabled = false; input.focus(); });
  }

  // el asistente solo aparece si el servidor ya tiene la clave configurada
  function init() {
    fetch('/api/chat', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ready) build(); })
      .catch(function () {});
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
