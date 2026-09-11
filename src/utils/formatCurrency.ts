export function formatINR(value: number | string | null | undefined, maxFractionDigits = 2): string {
  const n = Number(value);
  if (!isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: maxFractionDigits })}`;
}