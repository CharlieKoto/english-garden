import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Link2, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadWordImage } from '@/lib/images';

/**
 * Consistent image display for a word. The container fixes the footprint
 * (aspect ratio / max size), the image itself always keeps its real proportions
 * via `object-contain` — never stretched, never cropped.
 */
export function WordImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center',
        className ?? 'aspect-[16/10]'
      )}
    >
      <img src={src} alt={alt} className="max-w-full max-h-full w-auto h-auto object-contain" />
    </div>
  );
}

export interface ImageFieldState {
  /** What to render right now (object URL for a pending file, or the stored URL). */
  previewSrc: string | null;
  hasImage: boolean;
  /** Changed relative to the value the field was created with. */
  dirty: boolean;
  pickFile: (file: File) => void;
  setUrl: (url: string) => void;
  clear: () => void;
  reset: (url: string | null) => void;
  /** Upload any pending file and return the final value to persist on the word. */
  resolve: (userId: string) => Promise<string | null>;
}

/**
 * Shared image picker state for Add Word and Edit Word. A newly picked file is
 * only uploaded to Supabase Storage when `resolve()` is called (on save), so
 * cancelling an edit never leaves an orphaned upload behind.
 */
export function useImageField(initialUrl: string | null): ImageFieldState {
  const [url, setUrlState] = useState<string | null>(initialUrl);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const initial = useRef(initialUrl);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const made = URL.createObjectURL(file);
    setObjectUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [file]);

  const pickFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setUrlState(null);
  }, []);

  const setUrl = useCallback((next: string) => {
    setFile(null);
    setUrlState(next.trim() || null);
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setUrlState(null);
  }, []);

  const reset = useCallback((next: string | null) => {
    initial.current = next;
    setFile(null);
    setUrlState(next);
  }, []);

  const previewSrc = objectUrl ?? url;

  const resolve = useCallback(
    async (userId: string): Promise<string | null> => {
      if (file) return uploadWordImage(file, userId);
      return url;
    },
    [file, url]
  );

  return useMemo(
    () => ({
      previewSrc,
      hasImage: previewSrc !== null,
      dirty: !!file || url !== initial.current,
      pickFile,
      setUrl,
      clear,
      reset,
      resolve,
    }),
    [previewSrc, file, url, pickFile, setUrl, clear, reset, resolve]
  );
}

/**
 * The upload control itself: drag-and-drop, click-to-browse, preview, and
 * Replace / Remove buttons once an image is set. Optionally exposes a plain
 * image-URL input for people who'd rather paste a link.
 */
export function ImageField({
  field,
  alt,
  allowUrl = true,
}: {
  field: ImageFieldState;
  alt: string;
  allowUrl?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) field.pickFile(f);
          e.target.value = '';
        }}
      />

      {field.hasImage ? (
        <div className="space-y-2">
          <WordImage src={field.previewSrc} alt={alt} className="aspect-[16/10] max-h-64" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn btn-ghost px-3 py-2 text-sm border border-ink-200 dark:border-ink-700"
            >
              <RefreshCw size={15} /> Replace image
            </button>
            <button
              type="button"
              onClick={() => field.clear()}
              className="btn btn-ghost px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <X size={15} /> Remove image
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) field.pickFile(f);
          }}
          className={cn(
            'w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-ink-400 transition-colors',
            dragOver
              ? 'border-sage-400 text-sage-500 bg-sage-50 dark:bg-sage-900/20'
              : 'border-ink-200 dark:border-ink-700 hover:border-sage-400 hover:text-sage-500'
          )}
        >
          <ImagePlus size={24} />
          <span className="text-sm mt-2">Drag and drop an image, or click to upload</span>
        </button>
      )}

      {allowUrl && (
        <div className="mt-2">
          {showUrl ? (
            <div className="flex gap-2">
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="Paste an image URL"
                className="input text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  field.setUrl(urlDraft);
                  setShowUrl(false);
                  setUrlDraft('');
                }}
                className="btn btn-ghost px-3 text-sm border border-ink-200 dark:border-ink-700"
              >
                Use
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrl(true)}
              className="text-xs text-ink-400 hover:text-sage-500 inline-flex items-center gap-1"
            >
              <Link2 size={12} /> or use an image URL
            </button>
          )}
        </div>
      )}
    </div>
  );
}
