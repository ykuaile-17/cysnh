import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { RARITY_COLOR } from '@/lib/format';
import { PageHeader, Empty, Pill } from '@/components/common';
import { ImageStrip } from '@/components/ImageViewer';
import { Button } from '@/components/ui/button';
import { CardEditor } from '@/components/editors';

export default function CardDetail() {
  const { id = '', cardId = '' } = useParams();
  const navigate = useNavigate();
  const card = useLiveQuery(() => db.cards.get(cardId), [cardId]);
  const story = useLiveQuery(() => (card?.storyId ? db.gameStories.get(card.storyId) : undefined), [card?.storyId]);
  const account = useLiveQuery(() => (card?.accountId ? db.accounts.get(card.accountId) : undefined), [card?.accountId]);
  const stories = useLiveQuery(() => db.gameStories.where('gameId').equals(id).filter(s => !s.deletedAt).toArray(), [id]) || [];
  const accounts = useLiveQuery(() => db.accounts.where('gameId').equals(id).filter(a => !a.deletedAt).toArray(), [id]) || [];
  const [open, setOpen] = useState(false);

  if (!card) return <Empty icon="⏳" text="加载中…" />;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{card.name}</span>}
        onBack={() => navigate(`/games/${id}`)}
        subtitle={card.character ? `角色：${card.character}` : '卡面详情'}
        right={<Button variant="ghost" size="icon-sm" onClick={() => { setOpen(true); }}><Pencil className="size-4" /></Button>}
      />
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex gap-2">
          {card.rarity && <Pill color={RARITY_COLOR[card.rarity] || '#666'}>{card.rarity}</Pill>}
          <Pill color={card.owned ? '#22c55e' : '#94a3b8'}>{card.owned ? '已拥有' : '未拥有'}</Pill>
          {card.awaken ? <Pill color="#7c5cff">觉醒 / 突破 {card.awaken} 阶</Pill> : null}
        </div>
        {card.images && card.images.length > 0 && <ImageStrip images={card.images} h={28} gap="2" />}
        <InfoRow label="获取方式" value={card.obtainWay} />
        <InfoRow label="获得日期" value={card.obtainDate} />
        {story && (
          <button onClick={() => navigate(`/games/${id}/stories/${story.id}`)}
            className="flex items-center justify-between rounded-xl border bg-card px-3 py-2.5 text-left active:scale-[0.99]">
            <span className="text-sm text-muted-foreground">联动剧情</span>
            <span className="font-medium text-primary">{story.title}</span>
          </button>
        )}
        {account && (
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">所属账号</p>
            <p className="font-medium">{account.name}{account.server ? ` · ${account.server}` : ''}</p>
            {card.accountNote && <p className="mt-1 text-xs text-muted-foreground">备注：{card.accountNote}</p>}
          </div>
        )}
      </div>
      <div className="h-4" />
      <CardEditor open={open} onOpenChange={setOpen} gameId={id} card={card} stories={stories} accounts={accounts} />
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
