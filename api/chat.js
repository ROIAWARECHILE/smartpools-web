// Función sin servidor (Vercel) del asistente de Smart Pools.
// Responde preguntas y arma cotizaciones referenciales con la MISMA lógica del sitio (herramienta "cotizar"),
// usando Claude. La clave vive solo en el servidor (variable de entorno ANTHROPIC_API_KEY).
'use strict';
const P = require('./_pricing.js');

const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';
const WA = '+56 9 7614 6262';

// --- límites simples contra abuso (por instancia; para un tope estricto usar un KV/Supabase) ---
const HITS = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 60000, max = 20;
  const a = (HITS.get(ip) || []).filter(t => now - t < win);
  a.push(now); HITS.set(ip, a);
  if (HITS.size > 5000) for (const k of HITS.keys()) { if (!(HITS.get(k) || []).some(t => now - t < win)) HITS.delete(k); }
  return a.length > max;
}

function systemPrompt() {
  const modelos = P.modelosResumen().map(m =>
    `- ${m.nombre} (${m.tamano}): ${m.ancho_m}×${m.largo_m} m, prof. ${m.prof_min_m}–${m.prof_max_m} m. ` +
    `Estándar ${P.clp(m.precio_estandar)}, Con Bordes ${P.clp(m.precio_con_bordes)}, Climatizado ${P.clp(m.precio_climatizado)}.`
  ).join('\n');
  return `Eres el asistente virtual de Smart Pools, una empresa chilena de piscinas de fibra de vidrio reforzado. Hablas en español de Chile, cercano, claro y breve. Tu trabajo es responder dudas y ayudar a armar una cotización referencial. No generas PDF ni documentos.

REGLAS
- Responde SOLO sobre Smart Pools, sus piscinas, precios, instalación y cotizaciones. Si te preguntan algo ajeno, dilo con amabilidad y reencauza.
- Para CUALQUIER precio o cotización usa SIEMPRE la herramienta "cotizar". Nunca inventes ni calcules precios de memoria. Si faltan datos para cotizar (sobre todo el modelo y la comuna), pídelos de a poco, en lenguaje natural.
- Después de cotizar, muestra el total y el desglose en pesos chilenos. Aclara que es referencial, con IVA, y que el transporte y los accesos se confirman con una inspección digital del terreno.
- No pidas datos personales salvo que la persona quiera que la contacten; en ese caso basta nombre y teléfono/WhatsApp, y ofrécele el formulario del sitio o escribir por WhatsApp al ${WA}.
- Sé honesto: si no sabes algo o está fuera de catálogo, dilo y ofrece continuar por WhatsApp (${WA}).
- No prometas plazos, descuentos ni condiciones que no estén aquí.

DATOS DE SMART POOLS
- Piscinas de fibra de vidrio en una sola pieza. Lista en 48 horas desde que llega al patio. Garantía de 3 años por escrito. Más de 1000 piscinas instaladas en Chile.
- Zonas atendidas: Región Metropolitana, Valparaíso y O'Higgins. Para otras zonas, derivar a WhatsApp.
- Tres versiones de proyecto (todas con IVA, precio "desde" el modelo elegido):
  · Estándar: casco con 1 foco, 1 skimmer, 2 retornos y 1 drenaje; bomba 0,75 HP según modelo y filtro de cuarzo; tablero eléctrico; excavación con retroexcavadora y cama de nivelación; fittinería; instalación, conexionado y puesta en marcha.
  · Con Bordes: todo lo del Estándar + borde perimetral en Fulget, Pastelón o Deck de pino impregnado.
  · Climatizado: todo lo de Con Bordes + bomba de calor inverter.
- No incluye: transporte (se cotiza por comuna), retiro de escombros, agua de llenado ni relleno adicional.
- FINANCIAMIENTO: trabajamos con Salvum (Grupo BBVA). Se puede financiar hasta el 100% del proyecto, con pie $0, en cuotas. Requisitos: renta desde $600.000, 6 meses de antigüedad laboral, hasta 70 años y sin DICOM. Está sujeto a evaluación y aprobación de Salvum. Si preguntan por financiamiento, cuotas, crédito o cómo pagar, explícalo con entusiasmo y deriva a WhatsApp (${WA}) o al formulario para la evaluación. No inventes tasas, número de cuotas ni montos de cuota.
- Adicionales opcionales: mosaico cerámico, bomba de calor (si no es Climatizado), cascada (6 terminaciones) y baranda inox de acceso. La herramienta "cotizar" los suma.
- Accesos: si el camión no llega hasta donde irá la piscina (hay que pasarla por encima de un muro, reja o casa), se usa grúa pluma (acceso="No"). Si no entra una retroexcavadora, la excavación es manual y tiene costo extra (retro="No").

MODELOS Y PRECIOS (desde, con IVA):
${modelos}

Contacto: WhatsApp ${WA}, correo ventas@smartpools.cl. Sitio: smartpools.cl`;
}

const TOOL = {
  name: 'cotizar',
  description: 'Calcula la cotización referencial EXACTA de una piscina Smart Pools con los precios reales de la empresa. Úsala siempre que haya que dar un precio o un total. Si no conoces el modelo o la comuna, pídelos antes; puedes llamarla igual para mostrar un rango "desde".',
  input_schema: {
    type: 'object',
    properties: {
      modelo: { type: 'string', description: 'Nombre del modelo, p.ej. "Mykonos", "Praia". Si no lo sabes, omítelo (da un rango "desde").' },
      proyecto: { type: 'string', enum: ['Estándar', 'Con Bordes', 'Climatizado'], description: 'Versión del proyecto. Omite si no se definió.' },
      comuna: { type: 'string', description: 'Comuna de instalación (RM, Valparaíso u O\'Higgins).' },
      acceso: { type: 'string', enum: ['Sí', 'No', 'No sé'], description: '¿El camión llega hasta donde irá la piscina? "No" agrega grúa pluma.' },
      pluma: { type: 'integer', enum: [0, 1, 2, 3], description: 'Solo si acceso="No": largo de grúa pluma. 0=15 m, 1=20/25 m, 2=30 m, 3=35 m.' },
      retro: { type: 'string', enum: ['Sí', 'No', 'No sé'], description: '¿Entra una retroexcavadora? "No" agrega excavación manual.' },
      mosaico: { type: 'boolean', description: 'Adicional mosaico cerámico.' },
      bombaCalor: { type: 'boolean', description: 'Adicional bomba de calor (ignorado si proyecto="Climatizado").' },
      cascada: { type: 'integer', enum: [0, 1, 2, 3, 4, 5], description: 'Índice de cascada (0 a 5) si la quiere.' },
      barandas: { type: 'integer', description: 'Cantidad de barandas inox de acceso (0 a 6).' }
    },
    additionalProperties: false
  }
};

async function anthropic(body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text(); const e = new Error('anthropic ' + r.status); e.detail = t; e.status = r.status; throw e; }
  return r.json();
}

module.exports = async (req, res) => {
  if (req.method === 'GET') { res.status(200).json({ ready: !!process.env.ANTHROPIC_API_KEY }); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'sin_configurar', reply: 'El asistente aún no está configurado. Escríbenos por WhatsApp al ' + WA + '.' }); return; }
  try {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    if (rateLimited(ip)) { res.status(429).json({ error: 'rate', reply: 'Estás escribiendo muy rápido. Espera unos segundos o escríbenos por WhatsApp al ' + WA + '.' }); return; }
    let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}'); b = b || {};
    let msgs = Array.isArray(b.messages) ? b.messages : [];
    // saneo: solo user/assistant con texto, máximo 24 turnos, 1500 chars por mensaje
    msgs = msgs.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-24).map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') { res.status(400).json({ error: 'mensajes' }); return; }

    const base = { model: MODEL, max_tokens: 1024, system: systemPrompt(), tools: [TOOL], messages: msgs };
    if (/^claude-(opus|sonnet|haiku|fable|mythos)-5/.test(MODEL)) base.output_config = { effort: 'low' };

    let data = await anthropic(base), quote = null, guard = 0;
    while (data.stop_reason === 'tool_use' && guard++ < 4) {
      msgs.push({ role: 'assistant', content: data.content });
      const results = [];
      for (const c of data.content) {
        if (c.type === 'tool_use' && c.name === 'cotizar') {
          let out; try { out = P.cotizar(c.input || {}); quote = out; } catch (e) { out = { error: 'No pude calcular la cotización.' }; }
          results.push({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(out) });
        }
      }
      msgs.push({ role: 'user', content: results });
      data = await anthropic(Object.assign({}, base, { messages: msgs }));
    }
    const reply = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim()
      || 'Perdona, no te entendí. ¿Lo puedes decir de otra forma? También puedes escribirnos por WhatsApp al ' + WA + '.';
    res.status(200).json({ reply, quote });
  } catch (e) {
    res.status(200).json({ reply: 'Tuvimos un problema para responder. Inténtalo de nuevo o escríbenos por WhatsApp al ' + WA + '.', error: 'interno' });
  }
};
