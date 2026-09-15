import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search as SearchIcon, Trash2, Pencil } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import type { Merch } from '@/lib/types';
import { logHistory } from '@/lib/history';
import { MERCH_STATUS, MERCH_CATEGORY, fmtMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty, FloatAdd, Pill } from '@/components/common';
import { ZoomableImage, ImageStrip } from '@/components/ImageViewer';
import { EditorModal, Field, TextInput, SelectField, DateInput, NumInput, AreaInput, MultiImageField } from '@/components/form';
import { toast } from 'sonner';

const STATUS_OPTS = Object.entries(MERCH_STATUS).map(([value, label]) => ({ value, label }));

function MerchEditor({ merch, open, onOpenChange }: { merch: Merch | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [d, setD] = useState<Partial<Merch>>({});
  useEffect(() => {
    if (open) setD(merch ? { ...merch } : {
      name: '', cover: '🧸', ip: '', character: '', type: '手办', category: 'other', pattern: '', version: '', official: 'official',
      condition: '全新', qty: 1, unitPrice: 0, totalPrice: 0, acquireDate: new Date().toISOString().slice(0, 10),
      platform: '', shop: '', orderNo: '', logistics: '', status: 'own', location: '', tags: [], note: '', images: [],
    });
  }, [open, merch]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写名称'); return; }
    const total = (d.totalPrice ?? 0) || (d.qty || 1) * (d.unitPrice ?? 0);
    const images = d.images && d.images.length ? d.images : [];
    const now = Date.now();
    const coverImg = images[0] || d.coverImg;
    if (merch) { const p = { ...d, images, coverImg, totalPrice: total, updatedAt: now }; await db.merch.update(merch.id, p); logHistory('merch', merch.id, d.name!, 'update', merch, p); }
    else {
      const newId = uid();
      const p = { id: newId, createdAt: now, updatedAt: now, deletedAt: null,
        name: d.name!, cover: d.cover || '🧸', coverImg, images, category: (d.category as any) || 'other', ip: d.ip || '', character: d.character || '', type: d.type || '手办',
        pattern: d.pattern || '', version: d.version || '', official: (d.official as any) || 'official', condition: d.condition || '全新',
        qty: d.qty || 1, unitPrice: d.unitPrice ?? 0, totalPrice: total, acquireDate: d.acquireDate || '', platform: d.platform || '',
        shop: d.shop || '', orderNo: d.orderNo || '', logistics: d.logistics || '', status: (d.status as any) || 'own', location: d.location || '', tags: d.tags || [], note: d.note || '' };
      await db.merch.add(p); logHistory('merch', newId, d.name!, 'create', null, p);
    }
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={merch ? '编辑周边' : '添加周边'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <div className="flex items-center gap-3">
        <Field label="实物图"><Input value={d.cover || ''} onChange={e => setD({ ...d, cover: e.target.value })} className="w-16 text-center text-xl" maxLength={4} /></Field>
        <div className="flex-1"><TextInput label="名称" value={d.name || ''} onChange={v => setD({ ...d, name: v })} /></div>
      </div>
      <MultiImageField label="实物照片（可多张）" value={d.images || []} onChange={v => setD({ ...d, images: v })} max={9} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="分类" value={d.category || 'other'} onChange={v => setD({ ...d, category: v as any })} options={[{ value: 'game', label: '游戏周边' }, { value: 'star', label: '追星周边' }, { value: 'other', label: '其他' }]} />
        <SelectField label="官方/同人" value={d.official || 'official'} onChange={v => setD({ ...d, official: v as any })} options={[{ value: 'official', label: '官方' }, { value: 'doujin', label: '同人' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="IP/作品" value={d.ip || ''} onChange={v => setD({ ...d, ip: v })} />
        <TextInput label="角色/CP" value={d.character || ''} onChange={v => setD({ ...d, character: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="类型" value={d.type || ''} onChange={v => setD({ ...d, type: v })} placeholder="手办" />
        <SelectField label="官方/同人" value={d.official || 'official'} onChange={v => setD({ ...d, official: v as any })} options={[{ value: 'official', label: '官方' }, { value: 'doujin', label: '同人' }]} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="数量" value={d.qty ?? 1} onChange={v => setD({ ...d, qty: v })} />
        <NumInput label="单价" value={d.unitPrice ?? 0} onChange={v => setD({ ...d, unitPrice: v })} />
        <NumInput label="总价" value={d.totalPrice ?? 0} onChange={v => setD({ ...d, totalPrice: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateInput label="入手日期" value={d.acquireDate || ''} onChange={v => setD({ ...d, acquireDate: v })} />
        <SelectField label="状态" value={d.status || 'own'} onChange={v => setD({ ...d, status: v as any })} options={STATUS_OPTS} />
      </div>
      <TextInput label="收纳位置" value={d.location || ''} onChange={v => setD({ ...d, location: v })} placeholder="如：展示柜A" />
      <TextInput label="购买平台/店铺" value={d.platform || ''} onChange={v => setD({ ...d, platform: v })} />
    </EditorModal>
  );
}

export default function Merch() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Merch | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [cat, setCat] = useState('all');

  const merch = useLiveQuery(() => db.merch.filter(m => !m.deletedAt).toArray(), [], []) || [];

  useEffect(() => {
    const add = params.get('add');
    if (add === 'merch') { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    else if (add === 'order' || add === 'sale') {
      if (merch.length) navigate(`/merch/${merch[0].id}?add=${add}`, { replace: true });
      else { setEditing(null); setOpen(true); setParams({}, { replace: true }); }
    }
  }, [params, merch, navigate, setParams]);

  const filtered = merch
    .filter(g => filter === 'all' || g.status === filter)
    .filter(g => cat === 'all' || (g.category || 'other') === cat)
    .filter(g => !q || g.name.includes(q) || (g.ip || '').includes(q) || (g.character || '').includes(q) || (g.note || '').includes(q) || (g.orderNo || '').includes(q));

  return (
    <div>
      <div className="sticky top-[53px] z-20 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
        <span className="text-base font-semibold">周边</span>
        <div className="relative ml-auto flex-1 max-w-[180px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" className="h-8 pl-8 text-sm" />
        </div>
        <FloatAdd onClick={() => { setEditing(null); setOpen(true); }} label="添加" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 text-xs">
        {[{ v: 'all', l: '全部' }, { v: 'game', l: '游戏周边' }, { v: 'star', l: '追星周边' }, { v: 'other', l: '其他' }].map(f => (
          <button key={f.v} onClick={() => setCat(f.v)}
            className={`shrink-0 rounded-full px-3 py-1 ${cat === f.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{f.l}</button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-1 text-xs">
        {[{ v: 'all', l: '全部' }, { v: 'own', l: '拥有' }, { v: 'dup', l: '重复' }, { v: 'wish', l: '心愿' }, { v: 'sold', l: '已出' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`shrink-0 rounded-full px-3 py-1 ${filter === f.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{f.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon="🧸" text="还没有周边，点右上角添加" /> : (
        <div className="grid grid-cols-2 gap-3 px-3">
          {filtered.map(m => (
            <div key={m.id} onClick={() => navigate(`/merch/${m.id}`)}
              className="flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card p-3 active:scale-[0.98]">
              {m.images && m.images.length ? (
                <ImageStrip images={m.images} />
              ) : m.coverImg ? (
                <ZoomableImage src={m.coverImg} className="block h-24 w-full overflow-hidden rounded-lg" imgClassName="h-24 w-full object-cover" />
              ) : (
                <span className="text-3xl">{m.cover || '🧸'}</span>
              )}
              <p className="truncate font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.ip}{m.character ? ' · ' + m.character : ''}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Pill>{MERCH_STATUS[m.status]}</Pill>
                  {m.category && m.category !== 'other' && <Pill color="#7c5cff">{MERCH_CATEGORY[m.category]}</Pill>}
                </div>
                <span className="text-xs text-destructive">{fmtMoney(m.totalPrice)}</span>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => { softDelete(db.merch, m.id); toast('已移到回收站'); }}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-4" />
      <MerchEditor merch={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}
