import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PageHeader, StatCard, Pill } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { fmtMoney, fmtNum } from '@/lib/format';
import { monthlyTrend, distributeBy } from '@/lib/stats';

function rangeStart(range: string): Date {
  const now = new Date();
  if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (range === 'month') { return new Date(now.getFullYear(), now.getMonth(), 1); }
  if (range === 'year') { return new Date(now.getFullYear(), 0, 1); }
  return new Date(0);
}

function Bar({ title, data, color }: { title: string; data: { month: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="flex items-end gap-1.5" style={{ height: 110 }}>
        {data.map(d => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{d.value >= 10000 ? (d.value / 10000).toFixed(1) + 'w' : d.value}</span>
            <div className="flex w-full items-end justify-center" style={{ height: 80 }}>
              <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 80}px`, background: color, minHeight: d.value ? 3 : 0 }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dist({ title, data, color = '#7c5cff' }: { title: string; data: { name: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  if (!data.length) return <div className="rounded-xl border bg-card p-3"><p className="mb-2 text-sm font-semibold">{title}</p><p className="text-sm text-muted-foreground">暂无数据</p></div>;
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="flex flex-col gap-2">
        {data.slice(0, 8).map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-20 shrink-0 truncate text-xs">{d.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
            </div>
            <span className="w-8 text-right text-xs text-muted-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Stats() {
  const [range, setRange] = useState('all');

  const data = useLiveQuery(async () => {
    const [games, stars, novels, merch, schedules, supports, readingLogs, gachaRecords, sales, materials] = await Promise.all([
      db.games.filter(g => !g.deletedAt).toArray(),
      db.stars.filter(s => !s.deletedAt).toArray(),
      db.novels.filter(n => !n.deletedAt).toArray(),
      db.merch.filter(m => !m.deletedAt).toArray(),
      db.schedules.filter(s => !s.deletedAt).toArray(),
      db.supports.filter(s => !s.deletedAt).toArray(),
      db.readingLogs.filter(l => !l.deletedAt).toArray(),
      db.gachaRecords.filter(r => !r.deletedAt).toArray(),
      db.sales.filter(s => !s.deletedAt).toArray(),
      db.materials.filter(m => !m.deletedAt).toArray(),
    ]);
    return { games, stars, novels, merch, schedules, supports, readingLogs, gachaRecords, sales, materials };
  }, [], undefined);

  if (!data) return <PageHeader title="统计" />;

  const start = rangeStart(range);
  const inRange = (iso?: string) => !iso || new Date(iso) >= start;

  const spend =
    data.merch.filter(m => ['own', 'dup', 'lent', 'damaged', 'lost'].includes(m.status) && inRange(m.acquireDate)).reduce((s, m) => s + (m.totalPrice || 0), 0) +
    data.schedules.filter(s => inRange(s.datetime)).reduce((s, x) => s + (x.cost || 0), 0) +
    data.supports.filter(s => inRange(s.date)).reduce((s, x) => s + (x.amount || 0), 0);
  const income = data.sales.filter(s => ['sale', 'exchange'].includes(s.type) && inRange(s.date)).reduce((s, x) => s + (x.net || 0), 0);
  const gacha = data.gachaRecords.filter(r => inRange(r.datetime)).reduce((s, r) => s + (r.pulls || 0), 0);
  const readWords = data.readingLogs.filter(r => inRange(r.datetime)).reduce((s, r) => s + (r.words || 0), 0);
  const readMin = data.readingLogs.filter(r => inRange(r.datetime)).reduce((s, r) => s + (r.duration || 0), 0);
  const merchCount = data.merch.filter(m => ['own', 'dup'].includes(m.status) && inRange(m.acquireDate)).length;
  const schedCount = data.schedules.filter(s => inRange(s.datetime)).length;
  const readBooks = data.novels.filter(n => n.status === 'read').length;

  const merchInRange = data.merch.filter(m => inRange(m.acquireDate));
  const ipDist = distributeBy(merchInRange, m => m.ip).sort((a, b) => b.value - a.value);
  const typeDist = distributeBy(merchInRange, m => m.type);

  return (
    <div>
      <PageHeader title="数据统计" />
      <Tabs value={range} onValueChange={setRange} className="px-3 pt-2">
        <TabsList className="w-full">
          <TabsTrigger value="week">本周</TabsTrigger>
          <TabsTrigger value="month">本月</TabsTrigger>
          <TabsTrigger value="year">今年</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>

        <TabsContent value={range} className="flex flex-col gap-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="总花费" value={fmtMoney(spend)} accent="text-destructive" />
            <StatCard label="回血" value={fmtMoney(income)} accent="text-emerald-500" />
            <StatCard label="净花费" value={fmtMoney(spend - income)} />
            <StatCard label="总抽卡" value={`${fmtNum(gacha)} 抽`} accent="text-primary" />
            <StatCard label="阅读字数" value={readWords >= 10000 ? `${(readWords / 10000).toFixed(1)}万字` : `${fmtNum(readWords)}字`} />
            <StatCard label="阅读时长" value={`${Math.round(readMin / 60)}h`} />
          </div>

          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-sm font-semibold">总览</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="text-lg font-bold">{data.games.length}</p><p className="text-muted-foreground">游戏</p></div>
              <div><p className="text-lg font-bold">{data.stars.length}</p><p className="text-muted-foreground">追星</p></div>
              <div><p className="text-lg font-bold">{data.novels.length}</p><p className="text-muted-foreground">小说</p></div>
              <div><p className="text-lg font-bold">{data.merch.filter(m => ['own', 'dup'].includes(m.status)).length}</p><p className="text-muted-foreground">周边</p></div>
              <div><p className="text-lg font-bold">{data.materials.length}</p><p className="text-muted-foreground">物料</p></div>
              <div><p className="text-lg font-bold">{schedCount}</p><p className="text-muted-foreground">行程</p></div>
            </div>
          </div>

          <Bar title="月度花费趋势" data={monthlyTrend(data.merch, m => m.totalPrice, 6)} color="#f59e0b" />
          <Bar title="月度抽卡趋势" data={monthlyTrend(data.gachaRecords, r => r.pulls, 6).map(d => ({ month: d.month, value: d.value }))} color="#7c5cff" />
          <Bar title="月度阅读量(千字)" data={monthlyTrend(data.readingLogs, r => Math.round((r.words || 0) / 1000), 6)} color="#22c55e" />

          <Dist title="周边 IP 分布" data={ipDist} color="#f59e0b" />
          <Dist title="周边类型分布" data={typeDist} color="#7c5cff" />
        </TabsContent>
      </Tabs>
      <div className="h-4" />
    </div>
  );
}
