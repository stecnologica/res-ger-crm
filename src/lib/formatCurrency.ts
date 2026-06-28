/**
 * Formats a number as Colombian Peso (COP) currency.
 * Example: 1500000 → "$ 1.500.000"
 *          12500.5  → "$ 12.501"   (rounded to integer, no cents for COP)
 *
 * @param value - Numeric value to format
 * @param options - Override Intl.NumberFormatOptions if needed
 */
export function formatCOP(
  value: number,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

/**
 * Formats a number with thousand-point separators (no currency symbol).
 * Example: 1500000 → "1.500.000"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
