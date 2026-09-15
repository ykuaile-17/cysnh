import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider, useApp } from '@/lib/app-store';
import { seedIfEmpty } from '@/lib/db';
import { Shell } from '@/components/Shell';
import { LockScreen } from '@/components/LockScreen';
import Home from '@/pages/Home';
import Games from '@/pages/Games';
import GameDetail from '@/pages/GameDetail';
import CardDetail from '@/pages/CardDetail';
import StoryDetail from '@/pages/StoryDetail';
import Stars from '@/pages/Stars';
import StarDetail from '@/pages/StarDetail';
import MaterialDetail from '@/pages/MaterialDetail';
import PhotocardDetail from '@/pages/PhotocardDetail';
import Novels from '@/pages/Novels';
import NovelDetail from '@/pages/NovelDetail';
import Merch from '@/pages/Merch';
import MerchDetail from '@/pages/MerchDetail';
import Search from '@/pages/Search';
import Reminders from '@/pages/Reminders';
import Stats from '@/pages/Stats';
import Profile from '@/pages/Profile';
import Calendar from '@/pages/Calendar';
import DataImport from '@/pages/DataImport';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function ShellLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <span className="animate-pulse text-5xl">🎀</span>
      <p className="text-sm text-muted-foreground">正在打开次元收纳盒…</p>
    </div>
  );
}

function Root() {
  const { pin, loading } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    seedIfEmpty().then(() => setSeeded(true)).catch(() => setSeeded(true));
  }, []);

  if (loading || !seeded) return <Splash />;
  if (pin.enabled && !unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/games/:id/cards/:cardId" element={<CardDetail />} />
        <Route path="/games/:id/stories/:storyId" element={<StoryDetail />} />
        <Route path="/stars" element={<Stars />} />
        <Route path="/stars/:id" element={<StarDetail />} />
        <Route path="/stars/:id/materials/:mid" element={<MaterialDetail />} />
        <Route path="/stars/:id/photocards/:pid" element={<PhotocardDetail />} />
          <Route path="/novels" element={<Novels />} />
          <Route path="/novels/:id" element={<NovelDetail />} />
          <Route path="/merch" element={<Merch />} />
          <Route path="/merch/:id" element={<MerchDetail />} />
          <Route path="/search" element={<Search />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/import" element={<DataImport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Root />
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
