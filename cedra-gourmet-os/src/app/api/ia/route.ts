import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { IaRequest, IaResponse } from "@/lib/ia/contract";
import { describeQuoteLocally, parseRecipeLocally } from "@/lib/ia/local";

const MODEL = "claude-opus-5-5";
const MAX_INPUT_CHARS = 20_000;

const RecipeSchema = z.object({
  name: z.string(),
  portions: z.number(),
  ingredients: z.array(z.object({ name: z.string(), qty: z.number(), unit: z.string() })),
  steps: z.array(z.string()),
});

const RECIPE_SYSTEM = `Eres el asistente de costeo de una pastelería gourmet chilena. Recibes una receta en texto libre y la devuelves estructurada.
- Convierte cada ingrediente a una cantidad numérica con unidad métrica: g, kg, ml, l o unidad. Tazas, cucharadas y similares se convierten a gramos o mililitros según el ingrediente (1 taza de harina ≈ 120 g, de azúcar ≈ 200 g, de líquido = 240 ml; 1 cucharada = 15 ml; 1 cucharadita = 5 ml).
- Los nombres de ingredientes van en español de Chile, cortos y genéricos, como aparecerían en una lista de bodega ("Mantequilla sin sal", no "mantequilla a temperatura ambiente cortada en cubos").
- Los pasos son frases de taller: directas, con temperaturas y tiempos, sin numeración.
- Si el texto no indica porciones, estima según el tamaño de la preparación.`;

const DESCRIPTION_SYSTEM = `Redactas la descripción comercial que abre una cotización formal de pastelería de autor en Chile. Un solo párrafo de 50 a 80 palabras, en español de Chile, tono elegante y concreto: qué se entrega y por qué vale lo que cuesta. Sin precios, sin emojis, sin signos de exclamación y sin inventar ingredientes, sabores o servicios que no estén en los datos. Devuelve solo el párrafo.`;

function local(req: IaRequest, notice?: string): IaResponse {
  return req.task === "parse-recipe"
    ? { task: req.task, source: "local", recipe: parseRecipeLocally(req.text), notice }
    : { task: req.task, source: "local", description: describeQuoteLocally(req.brief), notice };
}

export async function POST(request: Request): Promise<NextResponse<IaResponse | { error: string }>> {
  let req: IaRequest;
  try {
    req = (await request.json()) as IaRequest;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  if (req.task !== "parse-recipe" && req.task !== "describe-quote") {
    return NextResponse.json({ error: "Tarea desconocida." }, { status: 400 });
  }
  if (req.task === "parse-recipe" && (typeof req.text !== "string" || req.text.length > MAX_INPUT_CHARS)) {
    return NextResponse.json({ error: `La receta debe ser texto de hasta ${MAX_INPUT_CHARS} caracteres.` }, { status: 400 });
  }

  // Sin clave la app sigue funcionando: responde el analizador local.
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(local(req));

  const client = new Anthropic();
  try {
    if (req.task === "parse-recipe") {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: RECIPE_SYSTEM,
        messages: [{ role: "user", content: req.text }],
        output_config: { effort: "low", format: zodOutputFormat(RecipeSchema) },
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        return NextResponse.json(local(req, "La IA no devolvió una receta; se usó el analizador local."));
      }
      return NextResponse.json({ task: req.task, source: "claude", recipe: response.parsed_output });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: DESCRIPTION_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(req.brief) }],
      output_config: { effort: "low" },
    });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (response.stop_reason === "refusal" || !text) {
      return NextResponse.json(local(req, "La IA no devolvió texto; se usó la plantilla local."));
    }
    return NextResponse.json({ task: req.task, source: "claude", description: text });
  } catch (error) {
    const reason =
      error instanceof Anthropic.AuthenticationError
        ? "La clave de Anthropic no es válida"
        : error instanceof Anthropic.RateLimitError
          ? "La IA está con límite de uso"
          : error instanceof Anthropic.APIError
            ? `La IA respondió con error ${error.status ?? ""}`.trim()
            : "No se pudo contactar a la IA";
    return NextResponse.json(local(req, `${reason}; se usó el modo local.`));
  }
}
