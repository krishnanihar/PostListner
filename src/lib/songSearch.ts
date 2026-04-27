/**
 * iTunes Search API client (no auth, CORS-enabled, no rate-limit auth needed).
 * Returns released-year + artist + track for the Phase 3 autocomplete. The
 * year feeds variation selection (memo §1F era axis). Free-text is preserved
 * if the user submits without picking a suggestion — graceful degradation.
 */

export interface SongSuggestion {
  trackName: string;
  artistName: string;
  /** ISO release date — may be missing on some results. */
  releaseDate?: string;
  /** Convenience: 4-digit year extracted from releaseDate, or null. */
  year: number | null;
  /** Stable key for React lists. */
  key: string;
}

interface ITunesResult {
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  trackId?: number;
  collectionId?: number;
}

const ENDPOINT = 'https://itunes.apple.com/search';

export async function searchSongs(query: string, limit = 6): Promise<SongSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `${ENDPOINT}?term=${encodeURIComponent(q)}&entity=song&limit=${limit}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = (await res.json()) as { results?: ITunesResult[] };
  const results = json.results ?? [];

  return results
    .filter((r): r is Required<Pick<ITunesResult, 'trackName' | 'artistName'>> & ITunesResult =>
      !!r.trackName && !!r.artistName
    )
    .map<SongSuggestion>((r, i) => {
      const year = r.releaseDate ? Number.parseInt(r.releaseDate.slice(0, 4), 10) : null;
      return {
        trackName: r.trackName,
        artistName: r.artistName,
        releaseDate: r.releaseDate,
        year: Number.isFinite(year as number) ? (year as number) : null,
        key: String(r.trackId ?? `${r.collectionId ?? 'k'}-${i}`),
      };
    });
}

export function formatSuggestion(s: SongSuggestion): string {
  return s.year ? `${s.trackName} — ${s.artistName} (${s.year})` : `${s.trackName} — ${s.artistName}`;
}
