// Función sin servidor (Vercel) para enviar las cotizaciones del formulario por correo,
// usando el SMTP propio de Smart Pools (DreamHost). Así el correo sale de un servidor
// autorizado y pasa SPF/DMARC, sin depender de servicios de terceros.
// Credenciales SOLO en variables de entorno de Vercel: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEAD_TO (opcional), SMTP_FROM (opcional).
'use strict';
const nodemailer = require('nodemailer');

const WA = '+56 9 7614 6262';

// --- límite simple contra abuso (por instancia) ---
const HITS = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 60000, max = 8;
  const a = (HITS.get(ip) || []).filter(t => now - t < win);
  a.push(now); HITS.set(ip, a);
  if (HITS.size > 5000) for (const k of HITS.keys()) { if (!(HITS.get(k) || []).some(t => now - t < win)) HITS.delete(k); }
  return a.length > max;
}

function configured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function rowsOf(d) {
  return [
    ['Nombre', d.nombre], ['Celular', d.telefono], ['Correo', d.correo],
    ['Comuna', d.comuna], ['Tamaño', d.tamano], ['Modelo', d.modelo], ['Proyecto', d.proyecto],
    ['Acceso camión/grúa', d.acceso], ['Retroexcavadora', d.retroexcavadora],
    ['Total referencial', d.precio_referencial], ['Comentarios', d.mensaje]
  ].filter(function (r) { return r[1] != null && String(r[1]).trim() !== ''; });
}

module.exports = async (req, res) => {
  if (req.method === 'GET') { res.status(200).json({ ready: configured() }); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'method' }); return; }
  if (!configured()) { res.status(503).json({ success: false, error: 'sin_configurar' }); return; }
  try {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    if (rateLimited(ip)) { res.status(429).json({ success: false, error: 'rate' }); return; }

    let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}'); b = b || {};

    // trampa anti-spam del lado del servidor: si viene llena, fingimos éxito y no enviamos
    if (b.sp_hp) { res.status(200).json({ success: true }); return; }
    if (!b.nombre || !b.telefono) { res.status(400).json({ success: false, error: 'faltan_datos' }); return; }

    const rows = rowsOf(b);
    const text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      (b.detalle ? '\n\nCotización referencial:\n' + b.detalle : '');
    const htmlRows = rows.map(function (r) {
      return '<tr><td style="padding:7px 14px;color:#4a5873;white-space:nowrap;border-top:1px solid #eef2f6">' + esc(r[0]) +
        '</td><td style="padding:7px 14px;font-weight:600;color:#122;border-top:1px solid #eef2f6">' + esc(r[1]) + '</td></tr>';
    }).join('');
    const html = '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:580px;color:#122">' +
      '<h2 style="color:#072a40;margin:0 0 2px;font-size:20px">Nueva cotización web</h2>' +
      '<p style="color:#6b7891;margin:0 0 16px;font-size:13px">Solicitud enviada desde smartpools.cl</p>' +
      '<table style="border-collapse:collapse;width:100%;border:1px solid #e6edf4;border-radius:12px;overflow:hidden;font-size:14px">' + htmlRows + '</table>' +
      (b.detalle ? '<p style="color:#4a5873;margin:16px 0 4px;font-weight:600;font-size:13px">Cotización referencial</p>' +
        '<pre style="white-space:pre-wrap;background:#f6f9fb;padding:12px 14px;border-radius:10px;color:#24324c;font:13px/1.5 system-ui;margin:0">' + esc(b.detalle) + '</pre>' : '') +
      '</div>';

    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465,   // 465 = SSL directo; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const to = process.env.LEAD_TO || process.env.SMTP_USER;
    const mail = {
      from: 'Smart Pools Web <' + from + '>',
      to: to,
      subject: 'Nueva cotización web: ' + b.nombre + (b.comuna ? ' (' + b.comuna + ')' : ''),
      text: text,
      html: html
    };
    const replyTo = b._replyto || b.correo;
    if (replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) mail.replyTo = replyTo;

    await transporter.sendMail(mail);
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(502).json({ success: false, error: 'envio', detail: String((e && e.message) || e).slice(0, 200) });
  }
};
