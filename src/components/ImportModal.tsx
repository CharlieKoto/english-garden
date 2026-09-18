import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '@/components/Modal';
import type { Store } from '@/lib/store';
import type { Word, WordStatus } from '@/lib/types';
import { cn, uid, todayISO } from '@/lib/utils';
import { AlertCircle, Check, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

interface Props {
  store: Store;
  open: boolean;
  onClose: () => void;
}

const FIELDS = [
  { key: 'word', label: 'Word', required: true },
  { key: 'definition', label: 'Translation / definition' },
  { key: 'example', label: 'Example sentence' },
  { key: 'part_of_speech', label: 'Part of speech' },
  { key: 'ipa', label: 'IPA / pronunciation' },
  { key: 'association', label: 'Association' },
  { key: 'story', label: 'Personal story' },
  { key: 'notes', label: 'Notes' },
  { key: 'status', label: 'Status' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'favorite', label: 'Favorite' },
  { key: 'image_url', label: 'Image URL' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

// Column-name variants the importer recognizes automatically, regardless of
// capitalization or spacing. First match wins.
const SYNONYMS: Record<FieldKey, string[]> = {
  word: ['word', 'term', 'vocabulary', 'english', 'headword', 'english word'],
  definition: ['definition', 'translation', 'meaning', 'translate', 'def', 'meaning/translation'],
  example: ['example', 'example sentence', 'sentence', 'usage', 'context', 'example of use'],
  part_of_speech: ['part of speech', 'pos', 'word type', 'type'],
  ipa: ['ipa', 'pronunciation', 'phonetic', 'transcription'],
  association: ['association', 'mnemonic', 'memory', 'memory trick'],
  story: ['story', 'personal story'],
  notes: ['notes', 'note', 'comment', 'comments'],
  status: ['status'],
  difficulty: ['difficulty', 'level'],
  favorite: ['favorite', 'favourite', 'starred', 'star'],
  image_url: ['image', 'image url', 'picture', 'photo', 'img'],
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function guessField(header: string): FieldKey | '' {
  const n = normalize(header);
  if (!n) return '';
  for (const field of FIELDS) {
    if (SYNONYMS[field.key].includes(n)) return field.key;
  }
  for (const field of FIELDS) {
    if (SYNONYMS[field.key].some((s) => n.includes(s) || s.includes(n))) return field.key;
  }
  return '';
}

type Step = 'pick' | 'map' | 'done';

/**
 * Excel/CSV import with column mapping. Any spreadsheet with a "word" column
 * can be imported — every other application field is optional and only used
 * if a matching column is found or chosen.
 */
export function ImportModal({ store, open, onClose }: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey | ''>>({});
  const [dedupe, setDedupe] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  function reset() {
    setStep('pick');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setError(null);
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const isCsv = /\.csv$/i.test(file.name);
      const wb = isCsv ? XLSX.read(await file.text(), { type: 'string' }) : XLSX.read(await file.arrayBuffer());
      const ws = wb.Sheets['Words'] || wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
      const nonEmpty = grid.filter((r) => r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''));
      if (nonEmpty.length < 2) throw new Error('That file has no data rows.');

      const hdrs = nonEmpty[0].map((h) => String(h ?? '').trim());
      const dataRows = nonEmpty.slice(1);
      const autoMap: Record<number, FieldKey | ''> = {};
      const used = new Set<FieldKey>();
      hdrs.forEach((h, i) => {
        const guess = guessField(h);
        if (guess && !used.has(guess)) {
          autoMap[i] = guess;
          used.add(guess);
        } else {
          autoMap[i] = '';
        }
      });

      setFileName(file.name);
      setHeaders(hdrs);
      setRows(dataRows);
      setMapping(autoMap);
      setStep('map');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    }
    setBusy(false);
  }

  const wordColumnMapped = Object.values(mapping).includes('word');
  const validRows = rows.filter((r) => {
    const wi = Object.entries(mapping).find(([, f]) => f === 'word')?.[0];
    if (wi === undefined) return false;
    const v = r[Number(wi)];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });

  function buildWords(): Word[] {
    return validRows.map((r) => {
      const vals: Partial<Record<FieldKey, string>> = {};
      headers.forEach((_, i) => {
        const field = mapping[i];
        if (!field) return;
        const cell = r[i];
        vals[field] = cell === undefined || cell === null ? '' : String(cell).trim();
      });
      const status = (['dont_know', 'learning', 'know'] as WordStatus[]).includes(vals.status as WordStatus)
        ? (vals.status as WordStatus)
        : 'dont_know';
      const favorite = ['true', '1', 'yes', 'y'].includes((vals.favorite || '').toLowerCase());
      return {
        id: uid(),
        word: vals.word || '',
        definition: vals.definition || null,
        part_of_speech: vals.part_of_speech || null,
        ipa: vals.ipa || null,
        example: vals.example || null,
        image_url: vals.image_url || null,
        association: vals.association || null,
        story: vals.story || null,
        status,
        category_id: categoryId || null,
        difficulty: parseInt(vals.difficulty || '', 10) || 1,
        favorite,
        notes: vals.notes || null,
        srs_interval: 0,
        srs_ease: 2.5,
        srs_reps: 0,
        srs_due: todayISO(),
        last_reviewed: null,
        created_at: new Date().toISOString(),
      };
    });
  }

  async function handleImport() {
    setBusy(true);
    setError(null);
    try {
      const words = buildWords();
      const outcome = await store.importWords(words, { dedupeByWord: dedupe });
      setResult(outcome);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
    setBusy(false);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import words" className="!max-w-2xl">
      {step === 'pick' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Import an Excel (.xlsx) or CSV file. Any columns you have — word, translation, example, and more —
            get mapped to your word cards on the next step. Only a "word" column is required.
          </p>
          <label className={cn(
            'flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-colors',
            'border-ink-200 dark:border-ink-700 hover:border-sage-400 hover:text-sage-500 text-ink-400'
          )}>
            {busy ? <Loader2 size={24} className="animate-spin" /> : <FileSpreadsheet size={24} />}
            <span className="text-sm">{busy ? 'Reading file…' : 'Click to choose a .xlsx, .xls or .csv file'}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </label>
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-1">{fileName}</p>
            <p className="text-xs text-ink-400">
              {rows.length} row{rows.length === 1 ? '' : 's'} found · {validRows.length} will be imported
              {!wordColumnMapped && ' (map a "Word" column to continue)'}
            </p>
          </div>

          {/* Column mapping */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-1/2 truncate text-ink-600 dark:text-ink-300" title={h}>
                  {h || `Column ${i + 1}`}
                </span>
                <select
                  value={mapping[i] || ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as FieldKey | '' }))}
                  className="input py-1.5 text-sm cursor-pointer"
                >
                  <option value="">Don't import</option>
                  {FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {validRows.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-400 mb-2">Preview</p>
              <div className="overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-50 dark:bg-ink-800/50">
                      {FIELDS.filter((f) => Object.values(mapping).includes(f.key)).map((f) => (
                        <th key={f.key} className="text-left px-3 py-2 font-medium text-ink-500 dark:text-ink-300">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 5).map((r, ri) => (
                      <tr key={ri} className="border-t border-ink-100 dark:border-ink-800">
                        {FIELDS.filter((f) => Object.values(mapping).includes(f.key)).map((f) => {
                          const colIdx = Object.entries(mapping).find(([, val]) => val === f.key)?.[0];
                          const cell = colIdx !== undefined ? r[Number(colIdx)] : '';
                          return (
                            <td key={f.key} className="px-3 py-2 text-ink-600 dark:text-ink-300 max-w-[16rem] truncate">
                              {cell === undefined || cell === null ? '' : String(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300 cursor-pointer">
              <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="accent-sage-500" />
              Skip words that already exist
            </label>
            {store.categories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-500 dark:text-ink-400">Add to folder:</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input py-1.5 text-sm cursor-pointer w-auto">
                  <option value="">No folder</option>
                  {store.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={busy || !wordColumnMapped || validRows.length === 0}
              className="btn btn-primary px-5 py-2.5 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import {validRows.length} word{validRows.length === 1 ? '' : 's'}
            </button>
            <button onClick={reset} className="btn btn-ghost px-5 py-2.5">Choose a different file</button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-500" />
          </div>
          <p className="text-lg font-medium mb-1">
            Imported {result.imported} word{result.imported === 1 ? '' : 's'}
          </p>
          {result.skipped > 0 && (
            <p className="text-sm text-ink-400 mb-4">{result.skipped} skipped as likely duplicates.</p>
          )}
          <button onClick={handleClose} className="btn btn-primary px-5 py-2.5 mt-2">Done</button>
        </div>
      )}
    </Modal>
  );
}
