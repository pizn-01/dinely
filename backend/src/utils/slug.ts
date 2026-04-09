import { supabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Generate a URL-friendly slug from a string.
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')    // Remove non-word chars
    .replace(/[\s_]+/g, '-')     // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')         // Remove duplicate hyphens
    .replace(/^-+|-+$/g, '');    // Trim hyphens from start/end
};

/**
 * Generate a unique slug by appending a random suffix and verifying
 * no collision exists in the organizations table.
 * Retries up to 10 times with increasing suffix length.
 */
export const generateUniqueSlug = async (text: string): Promise<string> => {
  const base = generateSlug(text);

  for (let attempt = 0; attempt < 10; attempt++) {
    // Use 6-char suffix for better collision resistance
    const suffix = Math.random().toString(36).substring(2, 8);
    const candidate = `${base}-${suffix}`;

    const { data } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    // No collision — this slug is unique
    if (!data) return candidate;
  }

  throw new AppError('Failed to generate unique slug after 10 attempts', 500);
};
