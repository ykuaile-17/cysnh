import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { STORY_TYPE, STORY_STATUS, fmtDate } from '@/lib/format';
import { PageHeader, Empty, Pill } from '@/components/common';
import { ImageStrip } from '@/components/ImageViewer';
import { Button } from '@/components/ui/button';
import { StoryEditor } from '@/components/editors';

export default function StoryDetail() {
  const { id = '', storyId = '' } = useParams();
  const navigate = useNavigate();
  const story = useLiveQuery(() => db.gameStories.get(storyId), [storyId]);
  const linked = useLiveQuery(() => db.cards.where('gameId').equals(id).filter(c => !c.deletedAt && c.storyId === storyId).toArray(), [id, storyId]) || [];
  const [open, setOpen] = useState(false);

  if (!story) return <Empty icon="⏳" text="加载中…" />;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{story.title}</span>}
        onBack={() => navigate(`/games/${id}`)}
        subtitle={`${STORY_TYPE[story.type]} · ${story.chapter || '—'}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => { setOpen(true); }}><Pencil className="size-4" /></Button>}
      />
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex flex-wrap gap-2">
          <Pill>{STORY_STATUS[story.status]}</Pill>
          {story.rating ? <Pill color="#f59e0b">{'★'.repeat(story.rating)}</Pill> : null}
          {story.spoiler && <Pill color="#ef4444">含剧透</Pill>}
        </div>
        <InfoRow label="开始" value={story.startDate ? fmtDate(story.startDate) : ''} />
        <InfoRow label="完成" value={story.endDate ? fmtDate(story.endDate) : ''} />
        {story.summary && <InfoBlock label="剧情梗概" value={story.summary} />}
        {story.feeling && <InfoBlock label="个人感想" value={story.feeling} />}
        {story.images && story.images.length > 0 && <ImageStrip images={story.images} h={28} gap="2" />}
        {story.note && <InfoBlock label="备注" value={story.note} />}
        {linked.length > 0 && (
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs text-muted-foreground">关联卡面（{linked.length}）</p>
            <div className="flex flex-wrap gap-1.5">
              {linked.map(c => (
                <button key={c.id} onClick={() => navigate(`/games/${id}/cards/${c.id}`)}
                  className="rounded-lg border bg-muted/40 p-1 text-center active:scale-95">
                  {c.coverImg ? <img src={c.coverImg} className="size-12 rounded object-cover" alt="" /> : <span className="block size-12 text-[10px] leading-tight flex items-center justify-center">{c.name}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-4" />
      <StoryEditor open={open} onOpenChange={setOpen} gameId={id} story={story} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
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
