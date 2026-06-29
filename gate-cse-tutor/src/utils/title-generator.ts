export function generateTitle(text: string): string {
  const cleaned = text.replace(/[#*`~\[\]()]/g, '').trim();
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57) + '...';
}
