import { useState, useRef } from 'react';
import type { Store } from '@/lib/store';
import type { Word, Category } from '@/lib/types';
import { downloadFile, downloadBlob, readFileText, cn, uid, todayISO } from '@/lib/utils';
import { ImportModal } from '@/components/ImportModal';
import * as XLSX from 'xlsx';
import {
  Download, Database, Keyboard, Info, Loader2, Check, AlertCircle, FileJson, FileSpreadsheet, Trash2,
} from 'lucide-react';

interface Props {
  store: Store;
}

export function SettingsPage({ store }: Props) {
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const jsonRef = useRef<HTMLInputElement>(null);

  const stamp = new Date().toISOString().split('T')[0];

  function exportCSV() {
    setExporting(true);
    const headers = [
      'word', 'definition', 'part_of_speech', 'ipa', 'example',
      'image_url', 'association', 'story', 'status', 'difficulty', 'favorite',
      'notes', 'category_id', 'srs_interval', 'srs_ease', 'srs_reps', 'srs_due', 'last_reviewed', 'created_at',
    ];
    const rows = store.words.map((w) =>
      headers.map((h) => {
        const val = (w as unknown as Record<string, unknown>)[h];
        if (typeof val === 'string' && val.includes(',')) return `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(`english-garden-${stamp}.csv`, csv, 'text/csv');
    setExporting(false);
  }

  function exportJSON() {
    setExporting(true);
    const data = { words: store.words, categories: store.categories, exported_at: new Date().toISOString() };
    downloadFile(`english-garden-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
    setExporting(false);
  }

  function exportXLSX() {
    setExporting(true);
    const wb = XLSX.utils.book_new();
    const wordData = store.words.map((w) => ({
      word: w.word,
      definition: w.definition,
      part_of_speech: w.part_of_speech,
      ipa: w.ipa,
      example: w.example,
      image_url: w.image_url,
      association: w.association,
      story: w.story,
      status: w.status,
      difficulty: w.difficulty,
      favorite: w.favorite,
      notes: w.notes,
      srs_interval: w.srs_interval,
      srs_ease: w.srs_ease,
      srs_reps: w.srs_reps,
      srs_due: w.srs_due,
      last_reviewed: w.last_reviewed,
      created_at: w.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(wordData);
    XLSX.utils.book_append_sheet(wb, ws, 'Words');
    if (store.categories.length) {
      const catWs = XLSX.utils.json_to_sheet(store.categories);
      XLSX.utils.book_append_sheet(wb, catWs, 'Categories');
    }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(`english-garden-${stamp}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    setExporting(false);
  }

  async function importJSON(file: File) {
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await readFileText(file);
      const data = JSON.parse(text) as { words?: Word[]; categories?: Category[] };
      if (!data.words || !Array.isArray(data.words)) throw new Error('invalid');
      const newWords = data.words.map((w) => ({
        id: w.id || uid(),
        word: w.word,
        definition: w.definition ?? null,
        part_of_speech: w.part_of_speech ?? null,
        ipa: w.ipa ?? null,
        example: w.example ?? null,
        image_url: w.image_url ?? null,
        association: w.association ?? null,
        story: w.story ?? null,
        status: (['dont_know', 'learning', 'know'].includes(w.status) ? w.status : 'dont_know') as Word['status'],
        category_id: w.category_id ?? null,
        difficulty: w.difficulty || 1,
        favorite: w.favorite || false,
        notes: w.notes ?? null,
        srs_interval: w.srs_interval || 0,
        srs_ease: w.srs_ease || 2.5,
        srs_reps: w.srs_reps || 0,
        srs_due: w.srs_due || todayISO(),
        last_reviewed: w.last_reviewed ?? null,
        created_at: w.created_at || new Date().toISOString(),
      }));
      if (data.categories) await store.importCategories(data.categories);
      await store.importWords(newWords);
      setImportMsg({ type: 'success', text: `Imported ${newWords.length} word${newWords.length !== 1 ? 's' : ''}.` });
    } catch {
      setImportMsg({ type: 'error', text: 'Failed to import JSON. Make sure the file is valid.' });
    }
    setImporting(false);
  }

  async function handleClearData() {
    if (!confirm('Delete ALL words, folders, and review history? This cannot be undone.')) return;
    await store.clearAll();
    setImportMsg({ type: 'success', text: 'All data cleared.' });
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-2">Settings</h1>
      <p className="text-ink-400 mb-8">Manage your data and preferences. Everything is saved to your account.</p>

      <Section icon={Database} title="Data management">
        <div className="space-y-3">
          <p className="text-xs text-ink-400 px-1">Export your vocabulary</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <ExportBtn icon={Download} label="CSV" onClick={exportCSV} disabled={exporting || store.words.length === 0} />
            <ExportBtn icon={FileJson} label="JSON" onClick={exportJSON} disabled={exporting || store.words.length === 0} />
            <ExportBtn icon={FileSpreadsheet} label="Excel" onClick={exportXLSX} disabled={exporting || store.words.length === 0} />
          </div>
          <p className="text-xs text-ink-400 px-1 pt-2">Import vocabulary</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <ImportBtn icon={FileSpreadsheet} label="Excel / CSV" onClick={() => setShowImport(true)} disabled={importing} />
            <ImportBtn icon={FileJson} label="JSON" onClick={() => jsonRef.current?.click()} disabled={importing} />
          </div>
          <p className="text-xs text-ink-400 px-1">
            Excel and CSV files map their columns to word, translation, example, and more — with a preview before anything is imported.
          </p>
          <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />

          {importMsg && (
            <div className={cn('flex items-center gap-2 px-4 py-3 rounded-xl text-sm', importMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400')}>
              {importMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {importMsg.text}
            </div>
          )}

          <div className="pt-2">
            <button onClick={handleClearData} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
              <Trash2 size={16} />
              Clear all data
            </button>
          </div>
        </div>
      </Section>

      <Section icon={Keyboard} title="Keyboard shortcuts">
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-3 py-2 rounded-xl bg-ink-50 dark:bg-ink-800/50">
              <span className="text-sm text-ink-600 dark:text-ink-300">{s.action}</span>
              <kbd className="text-xs font-mono px-2 py-1 rounded-md bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Info} title="About English Garden">
        <p className="text-sm text-ink-500 dark:text-ink-400 leading-relaxed">
          English Garden helps you build long-term English vocabulary through images, context, stories,
          and active recall — no translation needed. Your words sync to your account, and folders can be
          shared with other people or published for everyone.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
            <p className="text-2xl font-semibold font-serif">{store.words.length}</p>
            <p className="text-xs text-ink-400">Words</p>
          </div>
          <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
            <p className="text-2xl font-semibold font-serif">{store.categories.length}</p>
            <p className="text-xs text-ink-400">Folders</p>
          </div>
          <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
            <p className="text-2xl font-semibold font-serif">{store.reviewDays.reduce((s, d) => s + d.review_count, 0)}</p>
            <p className="text-xs text-ink-400">Reviews</p>
          </div>
        </div>
      </Section>

      <p className="text-center text-xs text-ink-400 mt-8">
        English Garden · Synced to your account
      </p>

      <ImportModal store={store} open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

const SHORTCUTS = [
  { action: 'Go to Home', keys: '1' },
  { action: 'Go to Words', keys: '2' },
  { action: 'Add a word', keys: '3' },
  { action: 'Review', keys: '4' },
  { action: 'Active Recall', keys: '5' },
  { action: 'Statistics', keys: '6' },
  { action: 'Folders', keys: '7' },
  { action: 'Discover', keys: '8' },
  { action: 'Settings', keys: '9' },
  { action: 'Quick search', keys: 'Cmd+K' },
  { action: 'Close / cancel', keys: 'Esc' },
];

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
        <Icon size={18} className="text-sage-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function ExportBtn({ icon: Icon, label, onClick, disabled }: { icon: typeof Download; label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors disabled:opacity-50">
      {disabled ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} className="text-sage-500" />}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ImportBtn({ icon: Icon, label, onClick, disabled }: { icon: typeof Download; label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors disabled:opacity-50">
      {disabled ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} className="text-sage-500" />}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
