import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search as SearchIcon, Trash2, Pencil } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Star } from '@/lib/types';
import { logHistory } from '@/lib/history';
import { STAR_STATUS, STAR_TYPE } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, FloatAdd, Pill } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, AreaInput, ImageField } from '@/components/form';
import { toast } from 'sonner';

const STATUS_OPTS = Object.entries(STAR_STATUS).map(([value, label]) => ({ value, label }));
const TYPE_OPTS = Object.entries(STAR_TYPE).map(([value, label]) => ({ value, label }));

function StarEditor({ star, open, onOpenChange }: { star: Star | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [d, setD] = useState<Partial<Star>>({});
  useEffect(() => {
    if (open) setD(star ? { ...star } : {
      name: '', alias: '', cover: '⭐', type: 'solo', group: '', company: '', birthday: '', debutDate: '',
      color: '#ff7eb6', color2: '', startDate: '', reason: '', status: 'active', level: '', tags: [], note: '',
    });
  }, [open, star]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写名称'); return; }
    const now = Date.now();
    if (star) { const p = { ...d, coverImg: d.coverImg, updatedAt: now }; await db.stars.update(star.id, p); logHistory('stars', star.id, d.name!, 'update', star, p); }
    else {
      const newId = uid();
      const p = { id: newId, createdAt: now, updatedAt: now, deletedAt: null,
        name: d.name!, alias: d.alias || '', cover: d.cover || '⭐', coverImg: d.coverImg, type: (d.type as any) || 'solo', group: d.group || '',
        company: d.company || '', birthday: d.birthday || '', debutDate: d.debutDate || '', color: d.color || '#ff7eb6', color2: d.color2 || '',
        startDate: d.startDate || '', reason: d.reason || '', status: (d.status as any) || 'active', level: d.level || '', tags: d.tags || [], note: d.note || '' };
      await db.stars.add(p); logHistory('stars', newId, d.name!, 'create', null, p);
    }
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={star ? '编辑对象' : '添加追星对象'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <div className="flex items-center gap-3">
        <Field label="头像"><Input value={d.cover || ''} onChange={e => setD({ ...d, cover: e.target.value })} className="w-16 text-center text-xl" maxLength={4} /></Field>
        <div className="flex-1"><TextInput label="名称/艺名" value={d.name || ''} onChange={v => setD({ ...d, name: v })} placeholder="如：星野遥" /></div>
      </div>
      <ImageField label="头像图（可选）" value={d.coverImg} onChange={v => setD({ ...d, coverImg: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="本名/别名" value={d.alias || ''} onChange={v => setD({ ...d, alias: v })} />
        <TextInput label="所属团体/公司" value={d.group || ''} onChange={v => setD({ ...d, group: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="类型" value={d.type || 'solo'} onChange={v => setD({ ...d, type: v as any })} options={TYPE_OPTS} />
        <SelectField label="状态" value={d.status || 'active'} onChange={v => setD({ ...d, status: v as any })} options={STATUS_OPTS} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateInput label="生日" value={d.birthday || ''} onChange={v => setD({ ...d, birthday: v })} />
        <DateInput label="出道日" value={d.debutDate || ''} onChange={v => setD({ ...d, debutDate: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="应援色（主）"><Input type="color" value={d.color || '#ff7eb6'} onChange={e => setD({ ...d, color: e.target.value })} className="h-9 w-20 p-1" /></Field>
        <Field label="应援色（双拼）"><Input type="color" value={d.color2 || '#ff7eb6'} onChange={e => setD({ ...d, color2: e.target.value })} className="h-9 w-20 p-1" /></Field>
      </div>
      {d.color2 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-4 w-12 rounded" style={{ background: `linear-gradient(135deg, ${d.color}, ${d.color2})` }} />
          双拼应援色预览
        </div>
      ) : null}
      <TextInput label="本命程度" value={d.level || ''} onChange={v => setD({ ...d, level: v })} placeholder="如：本命" />
      <TextInput label="入坑契机" value={d.reason || ''} onChange={v => setD({ ...d, reason: v })} />
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

export default function Stars() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Star | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const stars = useLiveQuery(() => db.stars.filter(s => !s.deletedAt).toArray(), [], []) || [];
  const materials = useLiveQuery(() => db.materials.filter(m => !m.deletedAt).toArray(), [], []) || [];
  const schedules = useLiveQuery(() => db.schedules.filter(s => !s.deletedAt).toArray(), [], []) || [];
  const supports = useLiveQuery(() => db.supports.filter(s => !s.deletedAt).toArray(), [], []) || [];

  useEffect(() => {
    const add = params.get('add');
    if (add === 'star') { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    else if (add === 'material' || add === 'schedule') {
      if (stars.length) navigate(`/stars/${stars[0].id}?add=${add}`, { replace: true });
      else { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    }
  }, [params, stars, navigate, setParams]);

  const matCount = (id: string) => materials.filter(m => m.starId === id).length;
  const schCount = (id: string) => schedules.filter(s => s.starId === id).length;
  const supAmount = (id: string) => supports.filter(s => s.starId === id).reduce((s, x) => s + (x.amount || 0), 0);

  const filtered = stars
    .filter(g => filter === 'all' || g.status === filter)
    .filter(g => !q || g.name.includes(q) || (g.note || '').includes(q) || (g.alias || '').includes(q));

  return (
    <div>
      <div className="sticky top-[53px] z-20 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
        <span className="text-base font-semibold">追星</span>
        <div className="relative ml-auto flex-1 max-w-[180px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" className="h-8 pl-8 text-sm" />
        </div>
        <FloatAdd onClick={() => { setEditing(null); setOpen(true); }} label="添加" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 text-xs">
        {[{ v: 'all', l: '全部' }, { v: 'active', l: '热恋' }, { v: 'stable', l: '平稳' }, { v: 'cooling', l: '淡坑' }, { v: 'watching', l: '观望' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`shrink-0 rounded-full px-3 py-1 ${filter === f.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{f.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon="⭐" text="还没有追星对象，点右上角添加" /> : (
        <div className="flex flex-col gap-2 px-3">
          {filtered.map(s => (
            <div key={s.id} onClick={() => navigate(`/stars/${s.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-3 active:scale-[0.99]">
              {s.coverImg ? <img src={s.coverImg} className="size-9 rounded-full object-cover" alt="" /> : (
                s.color2 ? (
                  <span className="size-9 rounded-full" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color2})` }} />
                ) : (
                  <span className="text-3xl" style={{ color: s.color }}>{s.cover || '⭐'}</span>
                )
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name} <span className="text-xs text-muted-foreground">{s.level}</span></p>
                <p className="text-xs text-muted-foreground">{STAR_STATUS[s.status]} · 物料{matCount(s.id)} · 行程{schCount(s.id)} · 应援{fmtMoneyShort(supAmount(s.id))}</p>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => { softDelete(db.stars, s.id); toast('已移到回收站'); }}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-4" />
      <StarEditor star={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function fmtMoneyShort(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}
