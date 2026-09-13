import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Star, BookOpen, Package, ChevronRight, Flame, Coins, Dice5, Clock, Sparkles } from 'lucide-react';
import { db, uid } from '@/lib/db';
import { useApp } from '@/lib/app-store';
import { fmtMoney, fmtNum, fmtDate, countdownText, daysUntil, GAME_STATUS, NOVEL_STATUS, MERCH_STATUS, STAR_STATUS } from '@/lib/format';
import { computeOverview } from '@/lib/stats';
import { StatCard, Pill } from '@/components/common';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, ui, modules } = useApp();

  const data = useLiveQuery(async () => {
    const [games, stars, novels, merch, reminders, gachaRecords, materials, readingLogs, sales, schedules] = await Promise.all([
      db.games.filter(g => !g.deletedAt && !g.archived).toArray(),
      db.stars.filter(s => !s.deletedAt).toArray(),
      db.novels.filter(n => !n.deletedAt).toArray(),
      db.merch.filter(m => !m.deletedAt).toArray(),
      db.reminders.filter(r => !r.deletedAt).toArray(),
      db.gachaRecords.filter(r => !r.deletedAt).toArray(),
      db.materials.filter(m => !m.deletedAt).toArray(),
      db.readingLogs.filter(l => !l.deletedAt).toArray(),
      db.sales.filter(s => !s.deletedAt).toArray(),
      db.schedules.filter(s => !s.deletedAt).toArray(),
    ]);
    return { games, stars, novels, merch, reminders, gachaRecords, materials, readingLogs, sales, schedules };
  }, [], undefined);

  if (!data) return null;

  const month = new Date().toISOString().slice(0, 7);
  const overview = computeOverview({
    games: data.games, merch: data.merch, sales: data.sales, schedules: data.schedules,
    supports: [], novels: data.novels, readingLogs: data.readingLogs, stars: data.stars,
    materials: data.materials, gachaRecords: data.gachaRecords, orders: [],
  });

  const monthSpend = data.merch.filter(m => ['own', 'dup', 'lent'].includes(m.status) && (m.acquireDate || '').startsWith(month)).reduce((s, m) => s + m.totalPrice, 0)
    + data.schedules.filter(s => (s.datetime || '').startsWith(month)).reduce((s, x) => s + (x.cost || 0), 0);
  const monthIncome = data.sales.filter(s => ['sale', 'exchange'].includes(s.type) && (s.date || '').startsWith(month)).reduce((s, x) => s + (x.net || 0), 0);
  const monthNet = monthSpend - monthIncome;
  const monthGacha = data.gachaRecords.filter(r => (r.datetime || '').startsWith(month)).reduce((s, r) => s + (r.pulls || 0), 0);
  const monthRead = data.readingLogs.filter(r => (r.datetime || '').startsWith(month)).reduce((s, r) => s + (r.words || 0), 0);

  const upcoming = data.reminders
    .filter(r => r.status === 'pending' && daysUntil(r.datetime) !== null && daysUntil(r.datetime)! >= 0)
    .sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime))
    .slice(0, 4);

  const recent = [
    ...data.gachaRecords.map(r => ({ kind: '抽卡', icon: '🎲', text: `抽了 ${r.pulls} 抽`, date: r.datetime })),
    ...data.materials.filter(m => m.status === 'watched').map(m => ({ kind: '物料', icon: '🎬', text: m.title, date: m.date })),
    ...data.readingLogs.map(r => ({ kind: '阅读', icon: '📖', text: `读到 ${r.progress}`, date: r.datetime })),
    ...data.merch.filter(m => m.status === 'own').map(m => ({ kind: '周边', icon: '🎎', text: `入手 ${m.name}`, date: m.acquireDate })),
    ...data.sales.map(s => ({ kind: '出物', icon: '💱', text: `回血 ${fmtMoney(s.net)}`, date: s.date })),
  ].sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0)).slice(0, 6);

  const moduleCards = [
    { path: '/games', icon: '🎮', label: '游戏', show: modules.games, count: data.games.length, color: '#7c5cff' },
    { path: '/stars', icon: '⭐', label: '追星', show: modules.stars, count: data.stars.length, color: '#ff7eb6' },
    { path: '/novels', icon: '📚', label: '小说', show: modules.novels, count: data.novels.length, color: '#22c55e' },
    { path: '/merch', icon: '🎎', label: '周边', show: modules.merch, count: data.merch.filter(m => ['own', 'dup'].includes(m.status)).length, color: '#f59e0b' },
  ].filter(m => m.show);

  return (
    <div className="flex flex-col">
      {/* 问候 */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs text-muted-foreground">{greeting()}，</p>
          <p className="text-xl font-bold">{profile?.nickname || '谷主'} 👋</p>
        </div>
        <span className="text-3xl">{profile?.avatar || '🌟'}</span>
      </div>

      {/* 今日待办 / 倒计时 */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="size-4" /> 待办与倒计时
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">近期没有待办，好好享受热爱吧～</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map(r => (
                <button key={r.id} onClick={() => navigate('/reminders')}
                  className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 text-left">
                  <span className="truncate text-sm">{r.title}</span>
                  <span className="shrink-0 text-xs font-medium text-primary">{countdownText(r.datetime)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 数据速览 */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <StatCard label="本月总花费" value={ui.hideAmount ? '***' : fmtMoney(monthSpend)} accent="text-destructive" />
        <StatCard label="本月净花费" value={ui.hideAmount ? '***' : fmtMoney(monthNet)} />
        <StatCard label="本月抽卡" value={`${fmtNum(monthGacha)} 抽`} accent="text-primary" />
        <StatCard label="本月阅读" value={monthRead >= 10000 ? `${(monthRead / 10000).toFixed(1)}万字` : `${fmtNum(monthRead)}字`} />
      </div>

      {/* 模块入口 */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          {moduleCards.map(m => (
            <button key={m.path} onClick={() => navigate(m.path)}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.count} 个</p>
              </div>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* 最近动态 */}
      <div className="px-4 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground/80">最近动态</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有记录，点右下角 ＋ 开始记录吧</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
                <span className="text-lg">{r.icon}</span>
                <span className="flex-1 truncate text-sm">{r.text}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(r.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
