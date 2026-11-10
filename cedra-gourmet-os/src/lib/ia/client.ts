import type { IaRequest, IaResponse } from "./contract";
import { describeQuoteLocally, parseRecipeLocally } from "./local";

/** Llama a /api/ia. Si la ruta no existe o no hay red, resuelve en el navegador con el modo local. */
export async function askIa<T extends IaRequest>(req: T): Promise<Extract<IaResponse, { task: T["task"] }>> {
  type R = Extract<IaResponse, { task: T["task"] }>;
  try {
    const res = await fetch("/api/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    if (res.ok) return (await res.json()) as R;
  } catch {
    // cae al modo local
  }
  const notice = "Sin conexión con el servidor; se usó el modo local.";
  return (
    req.task === "parse-recipe"
      ? { task: req.task, source: "local", recipe: parseRecipeLocally(req.text), notice }
      : { task: req.task, source: "local", description: describeQuoteLocally(req.brief), notice }
  ) as R;
}
