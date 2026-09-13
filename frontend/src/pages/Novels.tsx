import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search as SearchIcon, Trash2, Pencil } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Novel } from '@/lib/types';
import { logHistory } from '@/lib/history';
import { NOVEL_STATUS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, FloatAdd, Pill } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, NumInput, AreaInput, ImageField } from '@/components/form';
import { toast } from 'sonner';

const STATUS_OPTS = Object.entries(NOVEL_STATUS).map(([value, label]) => ({ value, label }));

function NovelEditor({ novel, open, onOpenChange }: { novel: Novel | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [d, setD] = useState<Partial<Novel>>({});
  useEffect(() => {
    if (open) setD(novel ? { ...novel } : {
      title: '', author: '', cover: '📚', type: '', theme: '', source: '', status: 'want',
      serialStatus: '', words: 0, chapters: 0, startDate: '', finishDate: '', rating: 0, tags: [], note: '',
    });
  }, [open, novel]);
  const save = async () => {
    if (!d.title?.trim()) { toast.error('请填写书名'); return; }
    const now = Date.now();
    if (novel) { const p = { ...d, coverImg: d.coverImg, updatedAt: now }; await db.novels.update(novel.id, p); logHistory('novels', novel.id, d.title!, 'update', novel, p); }
    else {
      const newId = uid();
      const p = { id: newId, createdAt: now, updatedAt: now, deletedAt: null,
        title: d.title!, author: d.author || '', cover: d.cover || '📚', coverImg: d.coverImg, type: d.type || '', theme: d.theme || '',
        source: d.source || '', status: (d.status as any) || 'want', serialStatus: d.serialStatus || '', words: d.words || 0,
        chapters: d.chapters || 0, startDate: d.startDate || '', finishDate: d.finishDate || '', rating: d.rating || 0, tags: d.tags || [], note: d.note || '' };
      await db.novels.add(p); logHistory('novels', newId, d.title!, 'create', null, p);
    }
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={novel ? '编辑小说' : '添加小说'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <div className="flex items-center gap-3">
        <Field label="封面"><Input value={d.cover || ''} onChange={e => setD({ ...d, cover: e.target.value })} className="w-16 text-center text-xl" maxLength={4} /></Field>
        <div className="flex-1"><TextInput label="书名" value={d.title || ''} onChange={v => setD({ ...d, title: v })} /></div>
      </div>
      <ImageField label="封面图（可选）" value={d.coverImg} onChange={v => setD({ ...d, coverImg: v })} />
      <TextInput label="作者" value={d.author || ''} onChange={v => setD({ ...d, author: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="类型" value={d.type || ''} onChange={v => setD({ ...d, type: v })} placeholder="奇幻" />
        <TextInput label="题材" value={d.theme || ''} onChange={v => setD({ ...d, theme: v })} placeholder="冒险" />
      </div>
      <SelectField label="状态" value={d.status || 'want'} onChange={v => setD({ ...d, status: v as any })} options={STATUS_OPTS} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="来源/平台" value={d.source || ''} onChange={v => setD({ ...d, source: v })} />
        <TextInput label="连载状态" value={d.serialStatus || ''} onChange={v => setD({ ...d, serialStatus: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="字数" value={d.words ?? 0} onChange={v => setD({ ...d, words: v })} />
        <NumInput label="章节数" value={d.chapters ?? 0} onChange={v => setD({ ...d, chapters: v })} />
      </div>
      <NumInput label="评分(1-5)" value={d.rating ?? 0} onChange={v => setD({ ...d, rating: v })} />
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

export default function Novels() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Novel | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const novels = useLiveQuery(() => db.novels.filter(n => !n.deletedAt).toArray(), [], []) || [];
  const logs = useLiveQuery(() => db.readingLogs.filter(l => !l.deletedAt).toArray(), [], []) || [];

  useEffect(() => {
    const add = params.get('add');
    if (add === 'novel') { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    else if (add === 'reading' || add === 'excerpt') {
      if (novels.length) navigate(`/novels/${novels[0].id}?add=${add}`, { replace: true });
      else { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    }
  }, [params, novels, navigate, setParams]);

  const readWords = (id: string) => logs.filter(l => l.novelId === id).reduce((s, x) => s + (x.words || 0), 0);
  const filtered = novels
    .filter(g => filter === 'all' || g.status === filter)
    .filter(g => !q || g.title.includes(q) || (g.author || '').includes(q) || (g.note || '').includes(q));

  return (
    <div>
      <div className="sticky top-[53px] z-20 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
        <span className="text-base font-semibold">小说</span>
        <div className="relative ml-auto flex-1 max-w-[180px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" className="h-8 pl-8 text-sm" />
        </div>
        <FloatAdd onClick={() => { setEditing(null); setOpen(true); }} label="添加" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 text-xs">
        {[{ v: 'all', l: '全部' }, { v: 'want', l: '想读' }, { v: 'reading', l: '在读' }, { v: 'read', l: '已读' }, { v: 'reread', l: '重读' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`shrink-0 rounded-full px-3 py-1 ${filter === f.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{f.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon="📚" text="还没有小说，点右上角添加" /> : (
        <div className="grid grid-cols-2 gap-3 px-3">
          {filtered.map(n => (
            <div key={n.id} onClick={() => navigate(`/novels/${n.id}`)}
              className="flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card p-3 active:scale-[0.98]">
              <div className="flex items-center gap-2">
                {n.coverImg ? <img src={n.coverImg} className="size-9 rounded-lg object-cover" alt="" /> : <span className="text-3xl">{n.cover || '📚'}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.author}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Pill>{NOVEL_STATUS[n.status]}</Pill>
                {n.rating ? <span className="text-xs text-amber-500">{'★'.repeat(n.rating)}</span> : null}
              </div>
              <p className="text-xs text-muted-foreground">已读 {readWords(n.id) >= 10000 ? (readWords(n.id) / 10000).toFixed(1) + '万字' : readWords(n.id) + '字'}</p>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(n); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => { softDelete(db.novels, n.id); toast('已移到回收站'); }}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-4" />
      <NovelEditor novel={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}
