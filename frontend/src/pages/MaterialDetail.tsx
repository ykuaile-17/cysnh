import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { MATERIAL_TYPE, MATERIAL_STATUS, fmtDate } from '@/lib/format';
import { PageHeader, Empty, Pill } from '@/components/common';
import { ImageStrip } from '@/components/ImageViewer';
import { Button } from '@/components/ui/button';
import { MaterialEditor } from '@/components/editors';

export default function MaterialDetail() {
  const { id = '', mid = '' } = useParams();
  const navigate = useNavigate();
  const m = useLiveQuery(() => db.materials.get(mid), [mid]);
  const [open, setOpen] = useState(false);

  if (!m) return <Empty icon="⏳" text="加载中…" />;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{m.title}</span>}
        onBack={() => navigate(`/stars/${id}`)}
        subtitle={`${MATERIAL_TYPE[m.type]} · ${m.album || '—'}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => { setOpen(true); }}><Pencil className="size-4" /></Button>}
      />
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex flex-wrap gap-2">
          <Pill>{MATERIAL_STATUS[m.status]}</Pill>
          {m.rating ? <Pill color="#f59e0b">{'★'.repeat(m.rating)}</Pill> : null}
        </div>
        <InfoRow label="期数/集数" value={m.episode} />
        <InfoRow label="日期" value={m.date ? fmtDate(m.date) : ''} />
        <InfoRow label="平台" value={m.platform} />
        {m.duration ? <InfoRow label="时长" value={`${m.duration} 分钟`} /> : null}
        {m.member && <InfoRow label="高光成员" value={m.member} />}
        {m.feeling && <InfoBlock label="感想/名场面" value={m.feeling} />}
        {m.images && m.images.length > 0 && <ImageStrip images={m.images} h={28} gap="2" />}
        {m.note && <InfoBlock label="备注" value={m.note} />}
      </div>
      <div className="h-4" />
      <MaterialEditor open={open} onOpenChange={setOpen} starId={id} material={m} />
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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}
