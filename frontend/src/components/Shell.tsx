import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, BarChart3, Plus, Home, Gamepad2, Star, BookOpen, Package, User, CalendarClock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useApp } from '@/lib/app-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const NAV = [
  { path: '/', label: '首页', icon: Home },
  { path: '/games', label: '游戏', icon: Gamepad2 },
  { path: '/stars', label: '追星', icon: Star },
  { path: '/novels', label: '小说', icon: BookOpen },
  { path: '/merch', label: '周边', icon: Package },
  { path: '/profile', label: '我的', icon: User },
];

function TopBar() {
  const navigate = useNavigate();
  const pending = useLiveQuery(
    () => db.reminders.filter(r => !r.deletedAt && r.status === 'pending' && new Date(r.datetime) >= new Date()).count(),
    [], 0,
  );
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/85 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5">
        <span className="text-lg">🎀</span>
        <span className="text-sm font-semibold tracking-tight">次元收纳盒</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => navigate('/search')} aria-label="搜索">
          <Search className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/reminders')} aria-label="提醒">
          <Bell className="size-5" />
          {pending > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {pending > 99 ? '99' : pending}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/stats')} aria-label="统计">
          <BarChart3 className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/calendar')} aria-label="卡池日历">
          <CalendarClock className="size-5" />
        </Button>
      </div>
    </header>
  );
}

function QuickAdd() {
  const navigate = useNavigate();
  const { modules } = useApp();
  const items = [
    { label: '添加游戏', icon: '🎮', show: modules.games, go: '/games?add=game' },
    { label: '记游戏剧情', icon: '📜', show: modules.games, go: '/games?add=story' },
    { label: '记抽卡', icon: '🎲', show: modules.games, go: '/games?add=gacha' },
    { label: '添加追星对象', icon: '⭐', show: modules.stars, go: '/stars?add=star' },
    { label: '记物料', icon: '🎬', show: modules.stars, go: '/stars?add=material' },
    { label: '记行程', icon: '🎫', show: modules.stars, go: '/stars?add=schedule' },
    { label: '添加小说', icon: '📚', show: modules.novels, go: '/novels?add=novel' },
    { label: '记阅读', icon: '📖', show: modules.novels, go: '/novels?add=reading' },
    { label: '记摘抄', icon: '✏️', show: modules.novels, go: '/novels?add=excerpt' },
    { label: '添加周边', icon: '🧸', show: modules.merch, go: '/merch?add=merch' },
    { label: '记购买', icon: '🛒', show: modules.merch, go: '/merch?add=order' },
    { label: '记出物', icon: '💱', show: modules.merch, go: '/merch?add=sale' },
  ];
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon-lg" className="fixed bottom-20 right-4 z-30 size-14 rounded-full shadow-lg" aria-label="快捷添加">
          <Plus className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>快捷记录</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-3 pb-4">
          {items.filter(i => i.show).map(i => (
            <button key={i.label} onClick={() => navigate(i.go)}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs transition-colors hover:bg-accent">
              <span className="text-2xl">{i.icon}</span>
              <span className="leading-tight">{i.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { modules } = useApp();
  const visibleNav = NAV.filter(n => {
    if (n.path === '/games') return modules.games;
    if (n.path === '/stars') return modules.stars;
    if (n.path === '/novels') return modules.novels;
    if (n.path === '/merch') return modules.merch;
    return true;
  });
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <TopBar />
      <main className="flex-1 pb-24">{children}</main>
      <QuickAdd />
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-stretch border-t bg-background/95 backdrop-blur">
        {visibleNav.map(n => {
          const active = location.pathname === n.path ||
            (n.path !== '/' && location.pathname.startsWith(n.path));
          return (
            <button key={n.path} onClick={() => navigate(n.path)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <n.icon className="size-5" />
              {n.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
