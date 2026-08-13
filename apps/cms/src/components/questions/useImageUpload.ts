'use client';

import { useCallback, useState } from 'react';

/**
 * One upload path for every image in the authoring form — the body, the solution,
 * and each option — so a size limit or a compression step only has to be added in
 * one place later.
 */
export function useImageUpload(onError?: (message: string) => void) {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true);
      try {
        const body = new FormData();
        body.append('image', file);
        const res = await fetch('/api/upload-image', { method: 'POST', body });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Upload failed.');
        return data.url as string;
      } catch (err: any) {
        onError?.(err?.message || 'Upload failed.');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [onError]
  );

  return { upload, isUploading };
}

/** The image in a paste, if the clipboard carried one. */
export function imageFromClipboard(e: React.ClipboardEvent): File | null {
  const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
  return item?.getAsFile() ?? null;
}
