import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, Dices, Sparkles, Plus, Pencil } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { toast } from 'sonner';
import { GachaPool, Game } from '@/lib/types';
import { POOL_TYPE, REMINDER_TYPE_LABEL, fmtDate, countdownText, daysUntil } from '@/lib/format';
import { PageHeader, Empty, Pill } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EditorModal, SelectField, TextInput, DateInput, NumInput } from '@/components/form';

export default function Calendar() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pool');
  const [poolOpen, setPoolOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<GachaPool | null>(null);

  const pools = useLiveQuery(() => db.gachaPools.filter(p => !p.deletedAt).toArray(), [], []) || [];
  const games = useLiveQuery(() => db.games.filter(g => !g.deletedAt).toArray(), [], []) || [];
  const reminders = useLiveQuery(() => db.reminders.filter(r => !r.deletedAt && r.status === 'pending').toArray(), [], []) || [];
  const schedules = useLiveQuery(() => db.schedules.filter(s => !s.deletedAt).toArray(), [], []) || [];

  const gameMap = Object.fromEntries(games.map(g => [g.id, g]));
  const now = Date.now();

  const addPoolReminder = async (p: GachaPool) => {
    if (!p.endDate) { toast.error('请先给卡池设置结束日期'); return; }
    const exist = reminders.find(r => r.title === `卡池结束：${p.name}`);
    if (exist) { toast('该卡池提醒已存在'); return; }
    await db.reminders.add({ id: uid(), createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null,
      title: `卡池结束：${p.name}`, module: 'game', targetId: p.gameId, type: 'gacha_end', datetime: p.endDate,
      repeat: 'none', advance: 1, priority: '中', status: 'pending', note: '' });
    toast.success('已加入提醒，可在「提醒」页查看');
  };

  const poolStatus = (p: GachaPool) => {
    const start = p.startDate ? +new Date(p.startDate) : null;
    const end = p.endDate ? +new Date(p.endDate) : null;
    if (start && start > now) return 'upcoming';
    if (end && end < now) return 'ended';
    return 'active';
  };

  const sortedPools = [...pools].sort((a, b) => {
    const sa = poolStatus(a), sb = poolStatus(b);
    const order = { active: 0, upcoming: 1, ended: 2 } as any;
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    const ea = a.endDate ? +new Date(a.endDate) : 0, eb = b.endDate ? +new Date(b.endDate) : 0;
    return ea - eb;
  });

  // 版本/活动：提醒（活动/复刻类）+ 追星行程
  const events = [
    ...reminders.map(r => ({ key: 'r' + r.id, title: r.title, date: r.datetime, module: '提醒', tag: REMINDER_TYPE_LABEL[r.type], color: '#7c5cff' })),
    ...schedules.map(s => ({ key: 's' + s.id, title: s.title, date: s.datetime, module: '行程', tag: s.type, color: '#22c55e' })),
  ].filter(e => e.date).sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <div>
      <PageHeader title="卡池 / 版本日历" onBack={() => navigate(-1)} />

      <Tabs value={tab} onValueChange={setTab} className="px-3 pt-2">
        <TabsList className="w-full">
          <TabsTrigger value="pool">卡池排期</TabsTrigger>
          <TabsTrigger value="version">版本 / 活动</TabsTrigger>
        </TabsList>

        <TabsContent value="pool" className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-sm text-muted-foreground">卡池排期（开始/结束日期会显示在日历上）</span>
            <Button size="sm" onClick={() => { setEditingPool(null); setPoolOpen(true); }}><Plus className="size-4" /> 添加卡池</Button>
          </div>
          {sortedPools.length === 0 ? <Empty icon="🎲" text="还没有卡池，点右上角「添加卡池」填写排期" /> : sortedPools.map(p => {
            const st = poolStatus(p);
            const badge = st === 'active' ? { t: '进行中', c: '#22c55e' } : st === 'upcoming' ? { t: '即将开始', c: '#f59e0b' } : { t: '已结束', c: '#94a3b8' };
            return (
              <div key={p.id} className="rounded-xl border bg-card p-3" onClick={() => p.gameId && navigate(`/games/${p.gameId}`)}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Dices className="size-4 text-primary" />{p.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Pill color={badge.c}>{badge.t}</Pill>
                    <button onClick={(e) => { e.stopPropagation(); setEditingPool(p); setPoolOpen(true); }}
                      className="rounded-full border p-1 text-muted-foreground active:scale-95" aria-label="编辑卡池"><Pencil className="size-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); addPoolReminder(p); }}
                      className="rounded-full border px-2 py-0.5 text-[11px] text-primary active:scale-95">加入提醒</button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {gameMap[p.gameId]?.name || '游戏'} · {POOL_TYPE[p.type] || p.type}
                  {p.type === 'rerun' && <span className="ml-1 text-amber-500">· 复刻</span>}
                  {p.pityHard ? <span className="ml-1">· 保底 {p.pityHard}</span> : ''}
                </p>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">开始 {p.startDate ? fmtDate(p.startDate) : '—'} · 结束 {p.endDate ? fmtDate(p.endDate) : '—'}</span>
                  {st !== 'ended' && <span className="font-medium text-primary">{p.endDate ? `结束${countdownText(p.endDate)}` : (p.startDate ? `开始${countdownText(p.startDate)}` : '')}</span>}
                </div>
                {p.type === 'rerun' && st !== 'ended' && (
                  <p className="mt-1 text-[11px] text-amber-500">⚡ 复刻提醒：错过等一年</p>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="version" className="flex flex-col gap-2 pt-2">
          {events.length === 0 ? <Empty icon="📅" text="还没有版本/活动安排" /> : events.map(e => {
            const d = daysUntil(e.date);
            return (
              <div key={e.key} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium"><Sparkles className="size-4" style={{ color: e.color }} />{e.title}</span>
                  <Pill color={e.color}>{e.tag}</Pill>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{fmtDate(e.date)} · {e.module}</span>
                  <span className="font-medium text-primary">{d !== null ? (d > 0 ? `还有 ${d} 天` : d === 0 ? '就是今天' : `已过 ${Math.abs(d)} 天`) : ''}</span>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
      <div className="h-4" />

      <PoolEditor open={poolOpen} onOpenChange={setPoolOpen} pool={editingPool} games={games} />
    </div>
  );
}

function PoolEditor({ open, onOpenChange, pool, games }: {
  open: boolean; onOpenChange: (v: boolean) => void; pool: GachaPool | null; games: Game[];
}) {
  const [d, setD] = useState<Partial<GachaPool>>({});
  useEffect(() => {
    if (open) setD(pool ? { ...pool } : { name: '', type: 'limited', gameId: (games[0]?.id || '') as any, startDate: '', endDate: '', pityHard: 0, pitySoft: 0 });
  }, [open, pool, games]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写卡池名称'); return; }
    if (!d.gameId) { toast.error('请选择所属游戏'); return; }
    const now = Date.now();
    if (pool) await db.gachaPools.update(pool.id, { ...d, updatedAt: now });
    else await db.gachaPools.add({ id: uid(), gameId: d.gameId as any, name: d.name.trim(), type: (d.type as any) || 'other', startDate: d.startDate || '', endDate: d.endDate || '', pityHard: d.pityHard || undefined, pitySoft: d.pitySoft || undefined, createdAt: now, updatedAt: now, deletedAt: null });
    toast.success('已保存'); onOpenChange(false);
  };
  const del = async () => {
    if (pool) { await softDelete(db.gachaPools, pool.id); toast('已删除卡池'); onOpenChange(false); }
  };
  return (
    <EditorModal title={pool ? '编辑卡池' : '添加卡池'} open={open} onOpenChange={onOpenChange} onSave={save}
      saveText={pool ? '保存' : '添加'}>
      <SelectField label="所属游戏" value={d.gameId || ''} onChange={v => setD({ ...d, gameId: v as any })}
        options={games.map(g => ({ value: g.id, label: g.name }))} />
      <TextInput label="卡池名称" value={d.name || ''} onChange={v => setD({ ...d, name: v })} placeholder="如：限定UP·星之少女" />
      <SelectField label="类型" value={d.type || 'limited'} onChange={v => setD({ ...d, type: v as any })}
        options={Object.entries(POOL_TYPE).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-2 gap-3">
        <DateInput label="开始日期" value={d.startDate || ''} onChange={v => setD({ ...d, startDate: v })} />
        <DateInput label="结束日期" value={d.endDate || ''} onChange={v => setD({ ...d, endDate: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="硬保底抽数" value={d.pityHard ?? 0} onChange={v => setD({ ...d, pityHard: v })} placeholder="如：90" />
        <NumInput label="软保底抽数" value={d.pitySoft ?? 0} onChange={v => setD({ ...d, pitySoft: v })} placeholder="如：74" />
      </div>
      {pool && (
        <button type="button" className="mt-1 text-sm text-destructive active:scale-95" onClick={del}>删除此卡池</button>
      )}
    </EditorModal>
  );
}
