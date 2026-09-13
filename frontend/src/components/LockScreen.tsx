import { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useApp } from '@/lib/app-store';
import { toast } from 'sonner';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { pin, profile } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const press = (d: string) => {
    if (code.length >= 6) return;
    const next = code + d;
    setCode(next);
    setError(false);
    if (next.length >= pin.code.length) {
      if (next === pin.code) {
        setTimeout(onUnlock, 150);
      } else {
        setError(true);
        setTimeout(() => setCode(''), 400);
      }
    }
  };
  const del = () => setCode(c => c.slice(0, -1));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/10 to-background px-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">{profile?.avatar || '🔒'}</span>
        <p className="text-lg font-semibold">{profile?.nickname || '谷主'}</p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <Lock className="size-3.5" /> 已开启隐私锁
        </p>
      </div>
      <div className="flex gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`size-3 rounded-full border ${code.length > i ? 'border-primary bg-primary' : 'border-muted-foreground/40'} `} />
        ))}
      </div>
      {error && <p className="text-sm text-destructive">密码错误，请重试</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} onClick={() => press(d)}
            className="flex size-16 items-center justify-center rounded-full bg-card text-xl font-medium shadow-sm active:scale-95">
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}
          className="flex size-16 items-center justify-center rounded-full bg-card text-xl font-medium shadow-sm active:scale-95">0</button>
        <button onClick={del} className="flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm active:scale-95">
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}
