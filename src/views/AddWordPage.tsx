import { useState, useRef } from 'react';
import type { Store } from '@/lib/store';
import type { View } from '@/lib/types';
import { cn, readFileAsDataURL } from '@/lib/utils';
import { Check, ImagePlus, Sparkles, X } from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
}

const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrasal verb', 'idiom'];

export function AddWordPage({ store, navigate }: Props) {
  const [word, setWord] = useState('');
  const [ipa, setIpa] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [association, setAssociation] = useState('');
  const [story, setStory] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await readFileAsDataURL(file);
    setImageDataUrl(dataUrl);
  }

  async function handleSave() {
    if (!word.trim()) return;
    await store.addWord({
      word: word.trim(),
      definition: definition.trim() || null,
      part_of_speech: partOfSpeech || null,
      ipa: ipa.trim() || null,
      example: example.trim() || null,
      image_url: imageDataUrl,
      association: association.trim() || null,
      story: story.trim() || null,
      category_id: categoryId,
      notes: notes.trim() || null,
      difficulty,
      favorite,
      status: 'dont_know',
    });
    setSaved(true);
    setTimeout(() => navigate({ name: 'words' }), 600);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-2">Add a Word</h1>
      <p className="text-ink-400 mb-6">Fill in the details for your new word. Everything is saved on your device.</p>

      <div className="space-y-5 animate-slide-up">
        {/* Word + IPA */}
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Word</label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. reluctant"
              className="input text-lg"
              autoFocus
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">IPA <span className="text-ink-400 font-normal">(optional)</span></label>
            <input
              value={ipa}
              onChange={(e) => setIpa(e.target.value)}
              placeholder="/rɪˈlʌktənt/"
              className="input font-mono"
            />
          </div>
        </div>

        {/* Part of speech */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Part of speech</label>
          <div className="flex flex-wrap gap-2">
            {POS_OPTIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setPartOfSpeech(partOfSpeech === pos ? '' : pos)}
                className={cn(
                  'chip cursor-pointer transition-all',
                  partOfSpeech === pos
                    ? 'bg-sage-500 text-white'
                    : 'bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Definition */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">English definition</label>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Write the meaning in English — avoid translating to your native language."
            className="input min-h-[80px] resize-y"
          />
        </div>

        {/* Example */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Example sentence</label>
          <textarea
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="A sentence that shows the word in real context."
            className="input min-h-[60px] resize-y"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Image <span className="text-ink-400 font-normal">(optional)</span></label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImage(f);
              e.target.value = '';
            }}
          />
          {imageDataUrl ? (
            <div className="relative group">
              <img src={imageDataUrl} alt={word} className="w-full h-48 object-cover rounded-2xl" />
              <button
                onClick={() => setImageDataUrl(null)}
                className="absolute top-3 right-3 btn btn-ghost p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleImage(f);
              }}
              className={cn(
                'w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-ink-400 transition-colors',
                dragOver ? 'border-sage-400 text-sage-500 bg-sage-50 dark:bg-sage-900/20' : 'border-ink-200 dark:border-ink-700 hover:border-sage-400 hover:text-sage-500'
              )}
            >
              <ImagePlus size={24} />
              <span className="text-sm mt-2">Drag and drop an image, or click to upload</span>
            </button>
          )}
        </div>

        {/* Association */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">
            Personal association <span className="text-ink-400 font-normal">(your memory trick)</span>
          </label>
          <textarea
            value={association}
            onChange={(e) => setAssociation(e.target.value)}
            placeholder="How will you remember this word? What does it remind you of?"
            className="input min-h-[80px] resize-y"
          />
        </div>

        {/* Story */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">
            Personal story <span className="text-ink-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="A moment from your life connected to this word..."
            className="input min-h-[80px] resize-y"
          />
        </div>

        {/* Category + Difficulty */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Folder</label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="input cursor-pointer"
            >
              <option value="">No folder</option>
              {store.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Difficulty</label>
            <div className="flex items-center gap-1 h-[46px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setDifficulty(n)}
                  className={cn(
                    'flex-1 h-full rounded-lg text-sm font-medium transition-all',
                    n <= difficulty
                      ? 'bg-sage-500 text-white'
                      : 'bg-ink-100 dark:bg-ink-800 text-ink-400 hover:bg-ink-200 dark:hover:bg-ink-700'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra notes..."
            className="input min-h-[60px] resize-y"
          />
        </div>

        {/* Favorite */}
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => setFavorite(!favorite)}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              favorite ? 'bg-sage-500' : 'bg-ink-200 dark:bg-ink-700'
            )}
          >
            <span className={cn(
              'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
              favorite ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
          <span className="text-sm font-medium text-ink-600 dark:text-ink-300">Add to favorites</span>
        </label>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!word.trim() || saved}
          className={cn('btn w-full py-3 text-base', saved ? 'bg-emerald-500 text-white' : 'btn-primary')}
        >
          {saved ? (
            <><Check size={20} /> Saved!</>
          ) : (
            <><Sparkles size={18} /> Add to my garden</>
          )}
        </button>
      </div>
    </div>
  );
}
