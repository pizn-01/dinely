/**
 * Strip characters that have special meaning in PostgREST filter strings.
 * Prevents injection via .or() / .ilike() style Supabase queries.
 *
 * Characters stripped:
 *  %  _  ,  (  )  .  \   — all used in PostgREST filter syntax
 */
export const sanitizeSearch = (input: string): string => {
  return input.replace(/[%_,().\\/]/g, '').trim().substring(0, 200);
};
