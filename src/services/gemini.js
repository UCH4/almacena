const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL;
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'llama';

async function callGemini(prompt) {
  if (!PROXY_URL) {
    throw new Error(
      'AI proxy no configurado. Configurá VITE_GEMINI_PROXY_URL en .env ' +
      'apuntando a tu Cloudflare Worker.'
    );
  }

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, temperature: 0.7, maxTokens: 2048, model: AI_MODEL })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI proxy error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('La IA devolvió una respuesta vacía');
  return text;
}

function extractJson(raw) {
  const json = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  return JSON.parse(json);
}

export async function suggestRecipes(products) {
  const stockList = products
    .filter(p => p.stock > 0)
    .map(p => `${p.nombre} (${p.stock} ${p.unit})`)
    .join('\n');

  const prompt = `Sos un asistente de cocina experto. Basado en el siguiente stock de alacena, sugerí 3-5 recetas prácticas que se puedan cocinar usando principalmente estos ingredientes.

Stock disponible:
${stockList || '(sin productos en stock)'}

Para cada receta, respondé SOLO con un JSON array de objetos con esta estructura exacta:
[
  {
    "emoji": "🍝",
    "nombre": "Nombre de la receta",
    "tiempo": "XX min",
    "dificultad": "Fácil/Media",
    "ingredientes": ["Ingrediente 1", "Ingrediente 2"],
    "pasos": ["Paso 1", "Paso 2"]
  }
]

No incluyas texto adicional ni markdown, solo el JSON.`;

  const raw = await callGemini(prompt);
  return extractJson(raw);
}

export async function generateMealPlan(products, membersInfo) {
  const stockList = products
    .filter(p => p.stock > 0)
    .map(p => `${p.nombre} (${p.stock} ${p.unit})`)
    .join('\n');

  const members = membersInfo
    ? Object.entries(membersInfo).map(([, v]) => v.name || v.displayName).filter(Boolean).join(', ')
    : 'familia';

  const prompt = `Sos un nutricionista y cocinero. Generá un plan alimentario semanal para ${members} usando el stock disponible.

Stock disponible:
${stockList || '(sin productos en stock)'}

Respondé SOLO con un JSON donde cada día de Lunes a Domingo tiene desayuno, almuerzo y cena. Todas las comidas deben ser variadas y usando los ingredientes del stock.

Formato exacto:
{
  "Lunes": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Martes": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Miércoles": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Jueves": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Viernes": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Sábado": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Domingo": { "breakfast": "...", "lunch": "...", "dinner": "..." }
}

No incluyas texto adicional ni markdown, solo el JSON.`;

  const raw = await callGemini(prompt);
  return extractJson(raw);
}
