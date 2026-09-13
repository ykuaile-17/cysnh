import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search as SearchIcon, Archive, Trash2, Pencil } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Game, GachaRecord } from '@/lib/types';
import { GAME_STATUS, fmtNum, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, FloatAdd, Pill } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, AreaInput, NumInput } from '@/components/form';
import { toast } from 'sonner';

const STATUS_OPTS = Object.entries(GAME_STATUS).map(([value, label]) => ({ value, label }));

function GameEditor({ game, open, onOpenChange, onSaved }: {
  game: Game | null; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void;
}) {
  const [d, setD] = useState<Partial<Game>>({});
  useEffect(() => {
    if (open) setD(game ? { ...game } : {
      name: '', cover: '🎮', platform: '', type: '', status: 'playing',
      startDate: '', progress: '', tags: [], note: '', archived: false, pityBase: 90,
    });
  }, [open, game]);

  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写游戏名称'); return; }
    const now = Date.now();
    if (game) {
      await db.games.update(game.id, { ...d, updatedAt: now });
    } else {
      await db.games.add({ id: uid(), createdAt: now, updatedAt: now, deletedAt: null,
        name: d.name!, cover: d.cover || '🎮', platform: d.platform || '', type: d.type || '',
        status: (d.status as any) || 'playing', startDate: d.startDate || '', progress: d.progress || '',
        tags: d.tags || [], note: d.note || '', archived: !!d.archived, pityBase: d.pityBase || 0 });
    }
    toast.success('已保存');
    onSaved();
    onOpenChange(false);
  };

  return (
    <EditorModal title={game ? '编辑游戏' : '添加游戏'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <div className="flex items-center gap-3">
        <Field label="封面">
          <Input value={d.cover || ''} onChange={e => setD({ ...d, cover: e.target.value })} className="w-16 text-center text-xl" maxLength={4} />
        </Field>
        <div className="flex-1">
          <TextInput label="游戏名称" value={d.name || ''} onChange={v => setD({ ...d, name: v })} placeholder="如：星轨幻想" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="平台" value={d.platform || ''} onChange={v => setD({ ...d, platform: v })} placeholder="iOS/Android" />
        <TextInput label="类型" value={d.type || ''} onChange={v => setD({ ...d, type: v })} placeholder="开放世界" />
      </div>
      <SelectField label="状态" value={d.status || 'playing'} onChange={v => setD({ ...d, status: v as any })} options={STATUS_OPTS} />
      <DateInput label="入坑日期" value={d.startDate || ''} onChange={v => setD({ ...d, startDate: v })} />
      <TextInput label="当前剧情进度" value={d.progress || ''} onChange={v => setD({ ...d, progress: v })} placeholder="如：主线第三章" />
      <NumInput label="保底抽数" value={d.pityBase ?? 90} onChange={v => setD({ ...d, pityBase: v })} />
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

export default function Games() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Game | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const games = useLiveQuery(() => db.games.filter(g => !g.deletedAt).toArray(), [], []) || [];
  const gacha = useLiveQuery(() => db.gachaRecords.filter(r => !r.deletedAt).toArray(), [], []) || [];

  useEffect(() => {
    const add = params.get('add');
    const edit = params.get('edit');
    if (add === 'game') { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    else if ((add === 'story' || add === 'gacha')) {
      if (games.length) navigate(`/games/${games[0].id}?add=${add}`, { replace: true });
      else { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    } else if (edit) {
      const g = games.find(x => x.id === edit);
      if (g) { setEditing(g); setOpen(true); }
      setParams({}, { replace: true });
    }
  }, [params, games, navigate, setParams]);

  const gachaCount = (id: string) => gacha.filter(r => r.gameId === id).reduce((s, r) => s + (r.pulls || 0), 0);
  const filtered = games
    .filter(g => filter === 'all' ? !g.archived : filter === 'archived' ? g.archived : g.status === filter)
    .filter(g => !q || g.name.includes(q) || (g.note || '').includes(q) || (g.tags || []).join(',').includes(q));

  return (
    <div>
      <div className="sticky top-[53px] z-20 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
        <span className="text-base font-semibold">游戏</span>
        <div className="relative ml-auto flex-1 max-w-[180px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" className="h-8 pl-8 text-sm" />
        </div>
        <FloatAdd onClick={() => { setEditing(null); setOpen(true); }} label="添加" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 text-xs">
        {[{ v: 'all', l: '全部' }, { v: 'playing', l: '在玩' }, { v: 'paused', l: '暂停' }, { v: 'completed', l: '通关' }, { v: 'archived', l: '归档' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`shrink-0 rounded-full px-3 py-1 ${filter === f.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon="🎮" text="还没有游戏，点右上角添加" />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-3">
          {filtered.map(g => (
            <div key={g.id} onClick={() => navigate(`/games/${g.id}`)}
              className="flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card p-3 active:scale-[0.98]">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{g.cover || '🎮'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.name}</p>
                  <Pill>{GAME_STATUS[g.status]}</Pill>
                </div>
              </div>
              <p className="truncate text-xs text-muted-foreground">{g.progress || '暂无进度'}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>🎲 {fmtNum(gachaCount(g.id))} 抽</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="size-4" /></Button>
                  {!g.archived
                    ? <Button variant="ghost" size="icon-sm" onClick={() => { db.games.update(g.id, { archived: true, updatedAt: Date.now() }); toast('已归档'); }}><Archive className="size-4" /></Button>
                    : <Button variant="ghost" size="icon-sm" onClick={() => { db.games.update(g.id, { archived: false, updatedAt: Date.now() }); toast('已取消归档'); }}><Archive className="size-4 text-primary" /></Button>}
                  <Button variant="ghost" size="icon-sm" onClick={() => { softDelete(db.games, g.id); toast('已移到回收站'); }}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-4" />
      <GameEditor game={editing} open={open} onOpenChange={setOpen} onSaved={() => {}} />
    </div>
  );
}
