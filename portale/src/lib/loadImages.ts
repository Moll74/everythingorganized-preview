export type LoadedImage = { src: string; width: number; height: number };

type Progress = (fraction: number) => void;

// Fetches each URL, reporting combined byte progress (or finished files when a
// Content-Length is missing), then decodes it from an object URL.
// A failed file resolves to null so the page can still play.
export async function loadImages(
  urls: string[],
  onProgress: Progress,
  signal: AbortSignal,
): Promise<(LoadedImage | null)[]> {
  const loaded = urls.map(() => 0);
  const totals = urls.map(() => 0);
  const done = urls.map(() => false);
  let byBytes = true;

  const report = () => {
    if (byBytes) {
      const total = totals.reduce((a, b) => a + b, 0);
      onProgress(total > 0 ? loaded.reduce((a, b) => a + b, 0) / total : 0);
    } else {
      onProgress(done.filter(Boolean).length / urls.length);
    }
  };

  const responses = await Promise.all(
    urls.map((url) => fetch(url, { signal, mode: "cors" }).catch((err: unknown) => err as Error)),
  );
  responses.forEach((res, i) => {
    const length = res instanceof Response ? Number(res.headers.get("Content-Length")) : 0;
    if (!length) byBytes = false;
    totals[i] = length;
  });

  return Promise.all(
    responses.map(async (res, i): Promise<LoadedImage | null> => {
      try {
        if (!(res instanceof Response)) throw res;
        if (!res.ok || !res.body) throw new Error(`${urls[i]}: HTTP ${res.status}`);
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done: finished, value } = await reader.read();
          if (finished) break;
          chunks.push(value);
          loaded[i] += value.byteLength;
          report();
        }
        const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("Content-Type") ?? "image/webp" });
        const src = URL.createObjectURL(blob);
        const img = new Image();
        img.src = src;
        await img.decode();
        return { src, width: img.naturalWidth, height: img.naturalHeight };
      } catch (err) {
        if (!signal.aborted) console.error("Portale: image failed to load", err);
        return null;
      } finally {
        done[i] = true;
        loaded[i] = totals[i];
        report();
      }
    }),
  );
}
