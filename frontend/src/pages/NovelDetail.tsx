import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, BookOpen, NotebookPen, Quote, Users, ListChecks } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Novel, ReadingLog, Note, Excerpt, Character, BookList } from '@/lib/types';
import { NOVEL_STATUS, NOTE_TYPE, READ_MODE, fmtDate, fmtNum } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader, Empty, Pill, StatCard } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, NumInput, AreaInput } from '@/components/form';
import { toast } from 'sonner';

export default function NovelDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const novel = useLiveQuery(() => db.novels.get(id), [id]);
  const logs = useLiveQuery(() => db.readingLogs.where('novelId').equals(id).filter(l => !l.deletedAt).toArray(), [id]) || [];
  const notes = useLiveQuery(() => db.notes.where('novelId').equals(id).filter(n => !n.deletedAt).toArray(), [id]) || [];
  const excerpts = useLiveQuery(() => db.excerpts.where('novelId').equals(id).filter(e => !e.deletedAt).toArray(), [id]) || [];
  const chars = useLiveQuery(() => db.characters.where('novelId').equals(id).filter(c => !c.deletedAt).toArray(), [id]) || [];
  const booklists = useLiveQuery(() => db.bookLists.filter(b => !b.deletedAt).toArray(), [], []) || [];

  const [rOpen, setROpen] = useState(false);
  const [nOpen, setNOpen] = useState(false);
  const [eOpen, setEOpen] = useState(false);
  const [cOpen, setCOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [editN, setEditN] = useState<Note | null>(null);
  const [editE, setEditE] = useState<Excerpt | null>(null);
  const [editC, setEditC] = useState<Character | null>(null);

  useEffect(() => {
    const add = params.get('add');
    if (add === 'reading') { setROpen(true); setParams({}, { replace: true }); }
    if (add === 'excerpt') { setEditE(null); setEOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  if (!novel) return <Empty icon="⏳" text="加载中…" />;

  const totalWords = logs.reduce((s, l) => s + (l.words || 0), 0);
  const totalMin = logs.reduce((s, l) => s + (l.duration || 0), 0);
  const avgSpeed = totalMin ? Math.round(totalWords / (totalMin / 60)) : 0;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2"><span className="text-xl">{novel.cover}</span>{novel.title}</span>}
        onBack={() => navigate('/novels')}
        subtitle={`${novel.author} · ${NOVEL_STATUS[novel.status]}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => navigate(`/novels?edit=${novel.id}`)}><Pencil className="size-4" /></Button>}
      />
      <div className="grid grid-cols-3 gap-2 px-4 pt-3">
        <StatCard label="阅读字数" value={totalWords >= 10000 ? (totalWords / 10000).toFixed(1) + '万' : fmtNum(totalWords)} />
        <StatCard label="阅读时长" value={`${Math.round(totalMin / 60)}h`} />
        <StatCard label="笔记/摘抄" value={`${notes.length}/${excerpts.length}`} />
      </div>

      <Tabs defaultValue="overview" className="px-3 pt-3">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="reading">阅读</TabsTrigger>
          <TabsTrigger value="note">笔记</TabsTrigger>
          <TabsTrigger value="excerpt">摘抄</TabsTrigger>
          <TabsTrigger value="char">角色</TabsTrigger>
          <TabsTrigger value="book">书单</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="总字数" value={fmtNum(novel.words)} />
            <StatCard label="章节数" value={novel.chapters} />
            <StatCard label="笔记数" value={notes.length} />
            <StatCard label="摘抄数" value={excerpts.length} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setROpen(true)}><BookOpen className="size-4" /> 记阅读</Button>
            <Button className="flex-1" variant="secondary" onClick={() => { setEditE(null); setEOpen(true); }}><Quote className="size-4" /> 记摘抄</Button>
          </div>
        </TabsContent>

        <TabsContent value="reading" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => setROpen(true)}><Plus className="size-4" /> 记阅读</Button></div>
          {logs.length === 0 ? <Empty icon="📖" text="还没有阅读记录" /> : [...logs].sort((a, b) => +new Date(b.datetime) - +new Date(a.datetime)).map(l => (
            <div key={l.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{l.startChapter} → {l.endChapter}</span>
                <span className="text-xs text-muted-foreground">{READ_MODE[l.mode]}</span>
              </div>
              <p className="text-xs text-muted-foreground">{fmtDate(l.datetime)} · {fmtNum(l.words)}字 · {l.duration}分钟 · 进度{l.progress}</p>
              {l.feeling && <p className="mt-1 text-sm">{l.feeling}</p>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="note" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditN(null); setNOpen(true); }}><Plus className="size-4" /> 写笔记</Button></div>
          {notes.length === 0 ? <Empty icon="📝" text="还没有笔记" /> : notes.map(n => (
            <div key={n.id} onClick={() => { setEditN(n); setNOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="font-medium">{n.title || NOTE_TYPE[n.type]}</span>
                <Pill>{NOTE_TYPE[n.type]}</Pill>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.content}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="excerpt" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditE(null); setEOpen(true); }}><Plus className="size-4" /> 记摘抄</Button></div>
          {excerpts.length === 0 ? <Empty icon="✏️" text="还没有摘抄" /> : excerpts.map(e => (
            <div key={e.id} onClick={() => { setEditE(e); setEOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <p className="text-sm">“{e.content}”</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>— {e.source}{e.favorite ? ' · ❤️' : ''}</span>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="char" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditC(null); setCOpen(true); }}><Plus className="size-4" /> 加角色</Button></div>
          {chars.length === 0 ? <Empty icon="👤" text="还没有角色" /> : chars.map(c => (
            <div key={c.id} onClick={() => { setEditC(c); setCOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <Pill>{c.type}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.identity} · 结局：{c.ending}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="book" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => setBOpen(true)}><Plus className="size-4" /> 建书单</Button></div>
          {booklists.length === 0 ? <Empty icon="📑" text="还没有书单" /> : booklists.map(b => (
            <div key={b.id} className="rounded-xl border bg-card p-3">
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.novelIds?.length || 0} 本 · {b.desc}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="stats" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="总阅读字数" value={fmtNum(totalWords)} />
            <StatCard label="总阅读时长" value={`${Math.round(totalMin / 60)} 小时`} />
            <StatCard label="平均阅读速度" value={avgSpeed ? `${fmtNum(avgSpeed)}字/时` : '—'} />
            <StatCard label="笔记数" value={notes.length} />
          </div>
        </TabsContent>
      </Tabs>
      <div className="h-4" />

      <ReadingEditor open={rOpen} onOpenChange={setROpen} novelId={id} />
      <NoteEditor open={nOpen} onOpenChange={setNOpen} novelId={id} note={editN} />
      <ExcerptEditor open={eOpen} onOpenChange={setEOpen} novelId={id} excerpt={editE} />
      <CharEditor open={cOpen} onOpenChange={setCOpen} novelId={id} character={editC} />
      <BookListEditor open={bOpen} onOpenChange={setBOpen} />
    </div>
  );
}

function ReadingEditor({ open, onOpenChange, novelId }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD({ datetime: new Date().toISOString().slice(0, 10), mode: 'ebook', startChapter: '', endChapter: '', words: 0, duration: 0, progress: '', mood: '', feeling: '', note: '' }); }, [open]);
  const save = async () => {
    const now = Date.now();
    await db.readingLogs.add({ id: uid(), novelId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已记录'); onOpenChange(false);
  };
  return (
    <EditorModal title="记阅读" open={open} onOpenChange={onOpenChange} onSave={save}>
      <DateInput label="日期" value={d.datetime || ''} onChange={v => setD({ ...d, datetime: v })} />
      <SelectField label="方式" value={d.mode || 'ebook'} onChange={v => setD({ ...d, mode: v })} options={Object.entries(READ_MODE).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="起始章节" value={d.startChapter || ''} onChange={v => setD({ ...d, startChapter: v })} />
        <TextInput label="结束章节" value={d.endChapter || ''} onChange={v => setD({ ...d, endChapter: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="本次字数" value={d.words ?? 0} onChange={v => setD({ ...d, words: v })} />
        <NumInput label="时长(分钟)" value={d.duration ?? 0} onChange={v => setD({ ...d, duration: v })} />
      </div>
      <TextInput label="总进度" value={d.progress || ''} onChange={v => setD({ ...d, progress: v })} placeholder="如：215/480" />
      <AreaInput label="本次感想" value={d.feeling || ''} onChange={v => setD({ ...d, feeling: v })} />
    </EditorModal>
  );
}

function NoteEditor({ open, onOpenChange, novelId, note }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD(note ? { ...note } : { type: 'short', title: '', chapter: '', date: new Date().toISOString().slice(0, 10), rating: 0, content: '', mood: '', spoiler: false, tags: [] }); }, [open, note]);
  const save = async () => {
    if (!d.content?.trim()) { toast.error('请填写内容'); return; }
    const now = Date.now();
    if (note) await db.notes.update(note.id, { ...d, updatedAt: now });
    else await db.notes.add({ id: uid(), novelId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={note ? '编辑笔记' : '写笔记'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <SelectField label="类型" value={d.type || 'short'} onChange={v => setD({ ...d, type: v })} options={Object.entries(NOTE_TYPE).map(([value, label]) => ({ value, label }))} />
      <TextInput label="标题" value={d.title || ''} onChange={v => setD({ ...d, title: v })} />
      <TextInput label="章节/页数" value={d.chapter || ''} onChange={v => setD({ ...d, chapter: v })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.spoiler} onChange={e => setD({ ...d, spoiler: e.target.checked })} /> 含剧透（折叠）</label>
      <AreaInput label="内容" value={d.content || ''} onChange={v => setD({ ...d, content: v })} rows={5} />
    </EditorModal>
  );
}

function ExcerptEditor({ open, onOpenChange, novelId, excerpt }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD(excerpt ? { ...excerpt } : { content: '', source: '', type: '', date: new Date().toISOString().slice(0, 10), feeling: '', favorite: false, best: false }); }, [open, excerpt]);
  const save = async () => {
    if (!d.content?.trim()) { toast.error('请填写摘抄内容'); return; }
    const now = Date.now();
    if (excerpt) await db.excerpts.update(excerpt.id, { ...d, updatedAt: now });
    else await db.excerpts.add({ id: uid(), novelId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={excerpt ? '编辑摘抄' : '记摘抄'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <AreaInput label="摘抄内容" value={d.content || ''} onChange={v => setD({ ...d, content: v })} rows={4} />
      <TextInput label="出处" value={d.source || ''} onChange={v => setD({ ...d, source: v })} placeholder="如：第212章" />
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.favorite} onChange={e => setD({ ...d, favorite: e.target.checked })} /> 收藏</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.best} onChange={e => setD({ ...d, best: e.target.checked })} /> 最爱</label>
      </div>
    </EditorModal>
  );
}

function CharEditor({ open, onOpenChange, novelId, character }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD(character ? { ...character } : { name: '', type: '', gender: '', identity: '', appearance: '', personality: '', ending: '', favor: 3, tags: [] }); }, [open, character]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写角色名'); return; }
    const now = Date.now();
    if (character) await db.characters.update(character.id, { ...d, updatedAt: now });
    else await db.characters.add({ id: uid(), novelId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={character ? '编辑角色' : '加角色'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="角色名" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="类型" value={d.type || ''} onChange={v => setD({ ...d, type: v })} placeholder="女主" />
        <TextInput label="性别/性向" value={d.gender || ''} onChange={v => setD({ ...d, gender: v })} />
      </div>
      <TextInput label="身份" value={d.identity || ''} onChange={v => setD({ ...d, identity: v })} />
      <TextInput label="结局" value={d.ending || ''} onChange={v => setD({ ...d, ending: v })} />
      <NumInput label="好感度(1-5)" value={d.favor ?? 3} onChange={v => setD({ ...d, favor: v })} />
    </EditorModal>
  );
}

function BookListEditor({ open, onOpenChange }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD({ name: '', desc: '', novelIds: [], isPublic: false }); }, [open]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写书单名'); return; }
    const now = Date.now();
    await db.bookLists.add({ id: uid(), createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已创建'); onOpenChange(false);
  };
  return (
    <EditorModal title="建书单" open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="书单名" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <AreaInput label="简介" value={d.desc || ''} onChange={v => setD({ ...d, desc: v })} />
    </EditorModal>
  );
}
