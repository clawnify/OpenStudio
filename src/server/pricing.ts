/**
 * Image-model catalogue and per-generation cost, both sourced from OpenRouter
 * rather than hardcoded here.
 *
 * Why this module exists: the model list used to be a hand-written array in
 * index.ts. Model IDs churn — by 2026-09 half the entries (FLUX.2, SeedDream,
 * gpt-image-1/2) had been withdrawn from OpenRouter entirely, so the picker
 * offered models that could only 404. `/api/v1/models` is the upstream source
 * of truth and it already carries the price, so listing live fixes the rot and
 * pays for the cost display in the same request.
 */

/** Shape of the bits of OpenRouter's `/api/v1/models` entry we consume. */
interface OpenRouterModel {
  id: string;
  name?: string;
  architecture?: { output_modalities?: string[] };
  pricing?: { image_output?: string };
}

export interface ImageModel {
  id: string;
  name: string;
  provider: "openrouter" | "openai" | "fal";
  /**
   * USD per *output image token* — OpenRouter's `pricing.image_output`.
   *
   * Deliberately not a per-image price: an image costs this times however many
   * image tokens the model emits, which varies by model and resolution. Verified
   * against a live call — Gemini 3.1 Flash Image billed 1120 image tokens at
   * 0.00006 = $0.0672. Since the unit is identical across models it is a sound
   * basis for comparing them, which is all the picker uses it for.
   */
  imageTokenPrice?: number;
}

/**
 * Last-resort list used only when the catalogue fetch fails, so a transient
 * OpenRouter blip degrades to a working picker instead of an empty one. Every
 * entry was verified live against `/api/v1/models` on 2026-09-03; treat it as a
 * cache of that call, never as the place to add a model.
 */
const FALLBACK_MODELS: ImageModel[] = [
  { id: "google/gemini-3.1-flash-lite-image", name: "Gemini 3.1 Flash Lite Image", provider: "openrouter", imageTokenPrice: 0.00003 },
  { id: "google/gemini-3.1-flash-image", name: "Gemini 3.1 Flash Image", provider: "openrouter", imageTokenPrice: 0.00006 },
  { id: "google/gemini-3-pro-image", name: "Gemini 3 Pro Image", provider: "openrouter", imageTokenPrice: 0.00012 },
  { id: "google/gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", provider: "openrouter", imageTokenPrice: 0.00003 },
  { id: "openai/gpt-5-image-mini", name: "GPT-5 Image Mini", provider: "openrouter", imageTokenPrice: 0.000008 },
  { id: "openai/gpt-5-image", name: "GPT-5 Image", provider: "openrouter", imageTokenPrice: 0.00004 },
  { id: "openai/gpt-5.4-image-2", name: "GPT-5.4 Image 2", provider: "openrouter", imageTokenPrice: 0.00003 },
];

/**
 * `openrouter/auto*` are routing pseudo-models: they advertise image output but
 * resolve to whatever model the router picks, so they carry no usable price and
 * would make the cost column lie.
 */
function isSelectableImageModel(m: OpenRouterModel): boolean {
  if (m.id.startsWith("openrouter/auto")) return false;
  return (m.architecture?.output_modalities || []).includes("image");
}

// One fetch per isolate. Workers isolates are short-lived, so this is a cheap
// request-coalescing cache rather than a long-lived one — no TTL needed.
let catalogue: Promise<ImageModel[]> | null = null;

/**
 * Live image-model catalogue from OpenRouter, price included.
 *
 * The endpoint is public, but the key is sent when present so the response
 * reflects anything account-scoped. Falls back to FALLBACK_MODELS on any
 * failure, and resets the cache so the next isolate retries.
 */
export function listOpenRouterImageModels(apiKey?: string): Promise<ImageModel[]> {
  if (catalogue) return catalogue;
  catalogue = (async () => {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (!res.ok) throw new Error(`OpenRouter model list failed: ${res.status}`);
    const body = (await res.json()) as { data?: OpenRouterModel[] };
    const models = (body.data || [])
      .filter(isSelectableImageModel)
      .map((m) => {
        const price = Number(m.pricing?.image_output);
        return {
          id: m.id,
          name: m.name?.replace(/^[^:]+:\s*/, "") || m.id,
          provider: "openrouter" as const,
          ...(Number.isFinite(price) && price > 0 ? { imageTokenPrice: price } : {}),
        };
      });
    if (models.length === 0) throw new Error("OpenRouter returned no image models");
    return models;
  })();
  catalogue.catch(() => { catalogue = null; });
  return catalogue.catch(() => FALLBACK_MODELS);
}

/** Usage block OpenRouter returns when the request sets `usage: { include: true }`. */
export interface OpenRouterUsage {
  cost?: number;
  cost_details?: { upstream_inference_cost?: number };
}

/**
 * USD actually spent on one generation.
 *
 * `usage.cost` is what OpenRouter billed. On a BYOK provider key it bills 0 and
 * reports the provider's own charge under `cost_details.upstream_inference_cost`
 * — verified live: a Gemini image call returns `cost: 0, is_byok: true` with
 * `upstream_inference_cost: 0.0336`. Reading `cost` alone would show $0.00 for
 * every BYOK generation, so fall through to the upstream figure.
 */
export function extractCostUsd(usage: OpenRouterUsage | undefined | null): number | undefined {
  if (!usage) return undefined;
  if (typeof usage.cost === "number" && usage.cost > 0) return usage.cost;
  const upstream = usage.cost_details?.upstream_inference_cost;
  if (typeof upstream === "number" && upstream > 0) return upstream;
  return typeof usage.cost === "number" ? usage.cost : undefined;
}

/**
 * Which unit the UI should spend in.
 *
 * `CLAWNIFY_TOKEN` is injected into every app deployed on Clawnify and is absent
 * from a self-hosted clone, which makes it the one honest signal available here:
 * the app receives an opaque `OPENROUTER_API_KEY` and cannot otherwise tell a
 * Clawnify-managed sub-key (billed in credits from a plan/pack) from an org's
 * own key. On Clawnify credits are the only user-facing unit; self-hosters pay
 * OpenRouter directly, so they get real dollars.
 *
 * Known edge: an org that brought its own OpenRouter key AND deploys on Clawnify
 * sees credits though it is billed in dollars. Credits remain the correct unit
 * for a Clawnify surface, and that combination is rare (most orgs have no BYOK
 * key), so this stays a display nuance rather than a wrong number.
 */
export function resolveCostUnit(env: { CLAWNIFY_TOKEN?: string }): "credits" | "usd" {
  return env.CLAWNIFY_TOKEN ? "credits" : "usd";
}
