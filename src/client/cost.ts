/**
 * The one place USD becomes something a person reads.
 *
 * The API always speaks USD because that is what the provider reports and it is
 * lossless. Which unit to *show* is decided server-side (`/api/features`
 * → `costUnit`) and applied here, so there is exactly one conversion site.
 */

export type CostUnit = "credits" | "usd";

/** Clawnify's peg: 1 credit = $0.005, so 200 credits = $1. */
const CREDITS_PER_USD = 200;

/**
 * Credits are integers and never free — a generation that costs a fraction of a
 * credit still rounds up to 1, so a total can never read "0 credits" after
 * actually spending money.
 *
 * This converts real provider spend at the platform peg to show what a
 * generation consumed. It is not a reading of the credit ledger, which applies
 * its own per-call minimums, so treat it as consumption rather than as the
 * authoritative debit.
 */
function toCredits(usd: number): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd * CREDITS_PER_USD));
}

/**
 * Format a USD amount in the unit the deployment bills in.
 *
 * Credits are shown as a self-contained unit with no dollar figure beside them —
 * a reader should never be asked to do mental arithmetic between two units.
 */
export function formatCost(usd: number | null | undefined, unit: CostUnit): string | null {
  if (typeof usd !== "number" || !Number.isFinite(usd)) return null;
  if (unit === "credits") {
    const credits = toCredits(usd);
    return `${credits.toLocaleString()} ${credits === 1 ? "credit" : "credits"}`;
  }
  if (usd === 0) return "$0.00";
  // Sub-cent generations are the norm, so keep enough precision to tell two
  // models apart instead of collapsing everything to "$0.00".
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

/**
 * Relative price of a model, as 1-4 dollar signs.
 *
 * Deliberately not an absolute per-image figure. Upstream publishes a price per
 * output *image token*, and the token count an image costs varies by model and
 * resolution, so any "$0.04 per image" label would be invented precision. The
 * token price is directly comparable between models though, which is what the
 * picker is actually for: telling the cheap option from the expensive one.
 *
 * Tiers are cut against the cheapest model available, so the scale stays
 * meaningful as the catalogue changes: 1x, up to 4x, up to 10x, beyond.
 */
export function relativePrice(
  tokenPrice: number | null | undefined,
  allTokenPrices: Array<number | null | undefined>,
): string | null {
  if (typeof tokenPrice !== "number" || !Number.isFinite(tokenPrice) || tokenPrice <= 0) return null;
  const known = allTokenPrices.filter(
    (p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0,
  );
  if (known.length === 0) return null;
  const cheapest = Math.min(...known);
  const ratio = tokenPrice / cheapest;
  if (ratio <= 1.5) return "$";
  if (ratio <= 4) return "$$";
  if (ratio <= 10) return "$$$";
  return "$$$$";
}

/** Sum of the generations in a run, skipping ones with no reported cost. */
export function sumCost(costs: Array<number | null | undefined>): number | null {
  const known = costs.filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) : null;
}
