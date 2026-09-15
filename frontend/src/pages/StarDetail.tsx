import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, Clapperboard, Ticket, HeartHandshake, Image } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Star, Material, Schedule, Support, Media, Photocard, PhotocardKind } from '@/lib/types';
import { logHistory } from '@/lib/history';
import {
  STAR_STATUS, MATERIAL_TYPE, MATERIAL_STATUS, SCHEDULE_TYPE, SCHEDULE_STATUS, SUPPORT_TYPE, MEDIA_TYPE,
  RARITY_COLOR, fmtMoney, fmtDate, countdownText,
} from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader, Empty, Pill, StatCard } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, NumInput, AreaInput, ImageField, LinkField, MultiImageField } from '@/components/form';
import { MaterialEditor, PhotocardEditor } from '@/components/editors';
import { ZoomableImage } from '@/components/ImageViewer';
import { toast } from 'sonner';

export default function StarDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const star = useLiveQuery(() => db.stars.get(id), [id]);
  const materials = useLiveQuery(() => db.materials.where('starId').equals(id).filter(m => !m.deletedAt).toArray(), [id]) || [];
  const schedules = useLiveQuery(() => db.schedules.where('starId').equals(id).filter(s => !s.deletedAt).toArray(), [id]) || [];
  const supports = useLiveQuery(() => db.supports.where('starId').equals(id).filter(s => !s.deletedAt).toArray(), [id]) || [];
  const media = useLiveQuery(() => db.media.where('starId').equals(id).filter(m => !m.deletedAt).toArray(), [id]) || [];
  const photocards = useLiveQuery(() => db.photocards.where('starId').equals(id).filter(p => !p.deletedAt).toArray(), [id]) || [];

  const [mOpen, setMOpen] = useState(false);
  const [sOpen, setSOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [mdOpen, setMdOpen] = useState(false);
  const [pcOpen, setPcOpen] = useState(false);
  const [editM, setEditM] = useState<Material | null>(null);
  const [editS, setEditS] = useState<Schedule | null>(null);
  const [editPc, setEditPc] = useState<Photocard | null>(null);

  useEffect(() => {
    const add = params.get('add');
    if (add === 'material') { setEditM(null); setMOpen(true); setParams({}, { replace: true }); }
    if (add === 'schedule') { setEditS(null); setSOpen(true); setParams({}, { replace: true }); }
    const em = params.get('editMaterial');
    if (em) { db.materials.get(em).then(m => { if (m) { setEditM(m); setMOpen(true); } }); setParams({}, { replace: true }); }
    const ep = params.get('editPc');
    if (ep) { db.photocards.get(ep).then(p => { if (p) { setEditPc(p); setPcOpen(true); } }); setParams({}, { replace: true }); }
  }, [params, setParams]);

  if (!star) return <Empty icon="⏳" text="加载中…" />;

  const spent = supports.reduce((s, x) => s + (x.amount || 0), 0);
  const nextSched = [...schedules].filter(s => s.status === 'want' || s.status === 'booked').sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime))[0];

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{star.coverImg ? <img src={star.coverImg} className="size-6 rounded-full object-cover" alt="" /> : (star.color2 ? <span className="size-6 rounded-full" style={{ background: `linear-gradient(135deg, ${star.color}, ${star.color2})` }} /> : <span className="text-xl" style={{ color: star.color }}>{star.cover}</span>)}{star.name}</span>}
        onBack={() => navigate('/stars')}
        subtitle={`${STAR_STATUS[star.status]} · ${star.level || ''}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => navigate(`/stars?edit=${star.id}`)}><Pencil className="size-4" /></Button>}
      />
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="物料" value={`${materials.length}`} />
          <StatCard label="行程" value={`${schedules.length}`} />
          <StatCard label="应援花费" value={fmtMoney(spent)} accent="text-destructive" />
        </div>
        {nextSched && (
          <div className="mt-2 rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">最近倒计时</p>
            <p className="font-medium">{nextSched.title} <span className="text-sm font-normal text-primary">{countdownText(nextSched.datetime)}</span></p>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="px-3 pt-3">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="material">物料</TabsTrigger>
          <TabsTrigger value="schedule">行程</TabsTrigger>
          <TabsTrigger value="support">应援</TabsTrigger>
          <TabsTrigger value="media">图频</TabsTrigger>
          <TabsTrigger value="photocard">小卡</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="物料数" value={materials.length} />
            <StatCard label="已看" value={materials.filter(m => m.status === 'watched').length} />
            <StatCard label="行程数" value={schedules.length} />
            <StatCard label="图频收藏" value={media.filter(m => m.favorite).length} />
          </div>
        </TabsContent>

        <TabsContent value="material" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditM(null); setMOpen(true); }}><Plus className="size-4" /> 添加</Button></div>
          {materials.length === 0 ? <Empty icon="🎬" text="还没有物料" /> : materials.map(m => (
            <div key={m.id} onClick={() => navigate(`/stars/${id}/materials/${m.id}`)} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{m.title}</span>
                <Pill>{MATERIAL_TYPE[m.type]}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.album}{m.episode ? ' · ' + m.episode : ''} · {MATERIAL_STATUS[m.status]}{m.rating ? ' · ' + '★'.repeat(m.rating) : ''}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditS(null); setSOpen(true); }}><Plus className="size-4" /> 添加</Button></div>
          {schedules.length === 0 ? <Empty icon="🎫" text="还没有行程" /> : [...schedules].sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)).map(s => (
            <div key={s.id} onClick={() => { setEditS(s); setSOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{s.title}</span>
                <span className="shrink-0 text-xs text-primary">{countdownText(s.datetime)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{SCHEDULE_TYPE[s.type]} · {s.city} · {SCHEDULE_STATUS[s.status]} · {fmtMoney(s.cost)}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="support" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => setSupOpen(true)}><Plus className="size-4" /> 添加</Button></div>
          {supports.length === 0 ? <Empty icon="💪" text="还没有应援记录" /> : supports.map(s => (
            <div key={s.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.project}</span>
                <span className="text-xs text-destructive">{fmtMoney(s.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{SUPPORT_TYPE[s.type]} · {s.platform} · {s.result}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="media" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => setMdOpen(true)}><Plus className="size-4" /> 添加</Button></div>
          {media.length === 0 ? <Empty icon="🖼️" text="还没有图频" /> : media.map(m => (
            <div key={m.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.title}</span>
                <span>{m.favorite ? '❤️' : m.best ? '💛' : ''}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{MEDIA_TYPE[m.type]} · {m.source}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="stats" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="物料(已看/总)" value={`${materials.filter(m => m.status === 'watched').length}/${materials.length}`} />
            <StatCard label="去过城市" value={new Set(schedules.map(s => s.city).filter(Boolean)).size} />
            <StatCard label="应援次数" value={supports.length} />
            <StatCard label="应援金额" value={fmtMoney(spent)} accent="text-destructive" />
          </div>
        </TabsContent>

        <TabsContent value="photocard" className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="小卡总数" value={photocards.reduce((s, p) => s + (p.total || 0), 0)} />
            <StatCard label="不同款" value={photocards.length} />
            <StatCard label="重复张数" value={photocards.reduce((s, p) => s + (p.dup || 0), 0)} accent="text-amber-500" />
          </div>
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditPc(null); setPcOpen(true); }}><Plus className="size-4" /> 加小卡</Button></div>
          {photocards.length === 0 ? <Empty icon="💳" text="还没有小卡图鉴" /> : (
            <div className="flex flex-col gap-2">
              {photocards.map(p => (
                <div key={p.id} onClick={() => navigate(`/stars/${id}/photocards/${p.id}`)} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
                  {p.photo && <ZoomableImage src={p.photo} className="mb-2 block h-24 w-full overflow-hidden rounded" imgClassName="h-24 w-full object-cover" />}
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium">{p.name}</span>
                    {p.rarity && <span className="text-xs shrink-0" style={{ color: RARITY_COLOR[p.rarity] || '#666' }}>{p.rarity}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.album} · 持有{p.owned}/{p.total}{p.dup ? ` · 重复${p.dup}` : ''}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <div className="h-4" />

      <MaterialEditor open={mOpen} onOpenChange={setMOpen} starId={id} material={editM} />
      <ScheduleEditor open={sOpen} onOpenChange={setSOpen} starId={id} schedule={editS} />
      <SupportEditor open={supOpen} onOpenChange={setSupOpen} starId={id} />
      <MediaEditor open={mdOpen} onOpenChange={setMdOpen} starId={id} />
      <PhotocardEditor open={pcOpen} onOpenChange={setPcOpen} starId={id} photocard={editPc} />
    </div>
  );
}

function ScheduleEditor({ open, onOpenChange, starId, schedule }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD(schedule ? { ...schedule } : { title: '', type: 'concert', datetime: '', city: '', venue: '', tier: '', price: 0, seat: '', companion: '', weather: '', status: 'want', repo: '', cost: 0, note: '' }); }, [open, schedule]);
  const save = async () => {
    if (!d.title?.trim()) { toast.error('请填写活动名称'); return; }
    const now = Date.now();
    if (schedule) await db.schedules.update(schedule.id, { ...d, updatedAt: now });
    else await db.schedules.add({ id: uid(), starId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={schedule ? '编辑行程' : '记行程'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="活动名称" value={d.title || ''} onChange={v => setD({ ...d, title: v })} />
      <SelectField label="类型" value={d.type || 'concert'} onChange={v => setD({ ...d, type: v })} options={Object.entries(SCHEDULE_TYPE).map(([value, label]) => ({ value, label }))} />
      <DateInput label="日期时间" value={d.datetime || ''} onChange={v => setD({ ...d, datetime: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="城市" value={d.city || ''} onChange={v => setD({ ...d, city: v })} />
        <TextInput label="场馆" value={d.venue || ''} onChange={v => setD({ ...d, venue: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="票档" value={d.tier || ''} onChange={v => setD({ ...d, tier: v })} />
        <NumInput label="票价" value={d.price ?? 0} onChange={v => setD({ ...d, price: v })} />
      </div>
      <SelectField label="状态" value={d.status || 'want'} onChange={v => setD({ ...d, status: v })} options={Object.entries(SCHEDULE_STATUS).map(([value, label]) => ({ value, label }))} />
      <AreaInput label="现场repo" value={d.repo || ''} onChange={v => setD({ ...d, repo: v })} />
    </EditorModal>
  );
}

function SupportEditor({ open, onOpenChange, starId }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD({ project: '', type: 'vote', platform: '', date: '', target: '', method: '', amount: 0, count: 0, result: '', note: '' }); }, [open]);
  const save = async () => {
    if (!d.project?.trim()) { toast.error('请填写项目名称'); return; }
    const now = Date.now();
    await db.supports.add({ id: uid(), starId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title="记应援" open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="项目名称" value={d.project || ''} onChange={v => setD({ ...d, project: v })} />
      <SelectField label="类型" value={d.type || 'vote'} onChange={v => setD({ ...d, type: v })} options={Object.entries(SUPPORT_TYPE).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="平台" value={d.platform || ''} onChange={v => setD({ ...d, platform: v })} />
        <DateInput label="日期" value={d.date || ''} onChange={v => setD({ ...d, date: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="金额" value={d.amount ?? 0} onChange={v => setD({ ...d, amount: v })} />
        <NumInput label="次数" value={d.count ?? 0} onChange={v => setD({ ...d, count: v })} />
      </div>
      <AreaInput label="结果/备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

function MediaEditor({ open, onOpenChange, starId }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD({ type: 'official', title: '', source: '', author: '', date: '', favorite: false, best: false, tags: [], note: '' }); }, [open]);
  const save = async () => {
    if (!d.title?.trim()) { toast.error('请填写标题'); return; }
    const now = Date.now();
    await db.media.add({ id: uid(), starId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title="加图频" open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="标题" value={d.title || ''} onChange={v => setD({ ...d, title: v })} />
      <SelectField label="类型" value={d.type || 'official'} onChange={v => setD({ ...d, type: v })} options={Object.entries(MEDIA_TYPE).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="来源" value={d.source || ''} onChange={v => setD({ ...d, source: v })} />
        <TextInput label="作者/站姐" value={d.author || ''} onChange={v => setD({ ...d, author: v })} />
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.favorite} onChange={e => setD({ ...d, favorite: e.target.checked })} /> 收藏</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.best} onChange={e => setD({ ...d, best: e.target.checked })} /> 最爱</label>
      </div>
    </EditorModal>
  );
}
