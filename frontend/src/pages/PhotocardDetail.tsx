import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { RARITY_COLOR } from '@/lib/format';
import { PageHeader, Empty, Pill } from '@/components/common';
import { ZoomableImage } from '@/components/ImageViewer';
import { Button } from '@/components/ui/button';
import { PhotocardEditor } from '@/components/editors';

export default function PhotocardDetail() {
  const { id = '', pid = '' } = useParams();
  const navigate = useNavigate();
  const p = useLiveQuery(() => db.photocards.get(pid), [pid]);
  const [open, setOpen] = useState(false);

  if (!p) return <Empty icon="⏳" text="加载中…" />;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{p.name}</span>}
        onBack={() => navigate(`/stars/${id}`)}
        subtitle={`${p.album || '小卡'}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => { setOpen(true); }}><Pencil className="size-4" /></Button>}
      />
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex flex-wrap gap-2">
          {p.rarity && <Pill color={RARITY_COLOR[p.rarity] || '#666'}>{p.rarity}</Pill>}
          <Pill color="#7c5cff">{p.kind}</Pill>
        </div>
        {p.photo && <ZoomableImage src={p.photo} className="block h-48 w-full overflow-hidden rounded-xl border bg-muted/40" imgClassName="h-48 w-full object-contain" />}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="总拥有" value={p.total} />
          <Stat label="不同款" value={p.owned} />
          <Stat label="重复" value={p.dup} accent={p.dup > 0} />
        </div>
        {p.note && (
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-1 text-xs text-muted-foreground">备注</p>
            <p className="whitespace-pre-wrap text-sm">{p.note}</p>
          </div>
        )}
      </div>
      <div className="h-4" />
      <PhotocardEditor open={open} onOpenChange={setOpen} starId={id} photocard={p} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value?: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${accent ? 'text-amber-500' : ''}`}>{value ?? 0}</p>
    </div>
  );
}
