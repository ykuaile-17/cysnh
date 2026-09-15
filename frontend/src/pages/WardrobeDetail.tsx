import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { db, softDelete } from '@/lib/db';
import { logHistory } from '@/lib/history';
import { PageHeader, Empty, Pill } from '@/components/common';
import { ImageStrip } from '@/components/ImageViewer';
import { Button } from '@/components/ui/button';
import { WardrobeEditor } from '@/components/editors';
import { toast } from 'sonner';

export default function WardrobeDetail() {
  const { id = '', wid = '' } = useParams();
  const navigate = useNavigate();
  const w = useLiveQuery(() => db.wardrobe.get(wid), [wid]);
  const [open, setOpen] = useState(false);

  if (!w) return <Empty icon="⏳" text="加载中…" />;

  const del = () => {
    if (!confirm('确定删除这件衣柜收集？')) return;
    softDelete(db.wardrobe, wid);
    logHistory('wardrobe', wid, w.name, 'delete', w, null);
    toast('已移到回收站');
    navigate(`/games/${id}`);
  };

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{w.name}</span>}
        onBack={() => navigate(`/games/${id}`)}
        subtitle="衣柜详情"
        right={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon-sm" onClick={del}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        }
      />
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex gap-2">
          <Pill color="#7c5cff">{w.kind}</Pill>
          <Pill color={w.owned ? '#22c55e' : '#94a3b8'}>{w.owned ? '已拥有' : '未拥有'}</Pill>
          {w.price != null && <Pill color="#f59e0b">¥{w.price}</Pill>}
        </div>
        {w.images && w.images.length > 0 && <ImageStrip images={w.images} />}
        <InfoRow label="价格" value={w.price != null ? `¥${w.price}` : ''} />
        <InfoRow label="类型" value={w.kind} />
        <InfoRow label="备注" value={w.note} />
      </div>
      <div className="h-4" />
      <WardrobeEditor open={open} onOpenChange={setOpen} gameId={id} wardrobe={w} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
