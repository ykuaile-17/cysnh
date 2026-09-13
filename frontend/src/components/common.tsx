import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PageHeader({ title, onBack, right, subtitle }: {
  title: ReactNode; onBack?: () => void; right?: ReactNode; subtitle?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-[53px] z-20 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
      {onBack && (
        <Button variant="ghost" size="icon-sm" onClick={onBack} className="-ml-1">
          <ChevronLeft className="size-5" />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ icon = '📭', text, action }: { icon?: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="text-4xl opacity-70">{icon}</span>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-1 pt-4">
      <h3 className="text-sm font-semibold text-foreground/80">{children}</h3>
      {right}
    </div>
  );
}

export function StatCard({ label, value, sub, accent }: {
  label: string; value: ReactNode; sub?: ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent || ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-xs"
      style={{ background: color ? `${color}22` : 'var(--muted)', color: color || 'var(--muted-foreground)' }}>
      {children}
    </span>
  );
}

export function FloatAdd({ onClick, label = '添加' }: { onClick: () => void; label?: string }) {
  return (
    <Button onClick={onClick} className="gap-1">
      <span className="text-base leading-none">＋</span> {label}
    </Button>
  );
}
