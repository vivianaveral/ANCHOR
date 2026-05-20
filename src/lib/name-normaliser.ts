const NAME_MAP: Record<string, string> = {
  'Mateo Salazar Ocampo': 'Mateo Salazar',
  'Thais Meisel Dobrzanska': 'Thais Meisel',
  'Allan Christopher Barcelona': 'Ace Barcelona',
  'Liezl Bothma': 'Liezl Jacobs',
  'Mevashan Kyle Gounden': 'Kyle Gounden',
  'Rameez Frederics': 'Rameez Fredericks',
};

/**
 * Normalise a rep name from its raw form (as it appears in Gong or HubSpot)
 * to the canonical display name used across the app.
 *
 * Exact match first, then returns the raw value unchanged.
 */
export function normaliseName(raw: string): string {
  const trimmed = raw.trim();
  if (NAME_MAP[trimmed] !== undefined) {
    return NAME_MAP[trimmed];
  }
  return trimmed;
}
