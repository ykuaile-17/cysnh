// 共享编辑器：卡面、剧情、追星物料、小卡（列表页与详情页共用，编辑用弹窗，查看走独立页面）
import { useState, useEffect } from 'react';
import { db, uid } from '@/lib/db';
import { GameStory, Card, Material, Photocard } from '@/lib/types';
import {
  STORY_TYPE, STORY_STATUS, RARITY_OPTIONS,
  MATERIAL_TYPE, MATERIAL_STATUS,
} from '@/lib/format';
import { EditorModal, SelectField, TextInput, DateInput, AreaInput, NumInput, MultiImageField, ImageField, LinkField } from '@/components/form';
import { toast } from 'sonner';

export function StoryEditor({ open, onOpenChange, gameId, story }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string; story: GameStory | null;
}) {
  const [d, setD] = useState<Partial<GameStory>>({});
  useEffect(() => {
    if (open) setD(story ? { ...story } : {
      type: 'main', title: '', chapter: '', status: 'unwatch', startDate: '', endDate: '',
      progress: '', summary: '', feeling: '', rating: 0, spoiler: false, tags: [], note: '', images: [],
    });
  }, [open, story]);
  const save = async () => {
    if (!d.title?.trim()) { toast.error('请填写标题'); return; }
    const now = Date.now();
    if (story) await db.gameStories.update(story.id, { ...d, updatedAt: now });
    else await db.gameStories.add({ id: uid(), gameId, createdAt: now, updatedAt: now, deletedAt: null,
      type: (d.type as any) || 'main', title: d.title!, chapter: d.chapter || '', startDate: d.startDate || '',
      endDate: d.endDate || '', status: (d.status as any) || 'unwatch', progress: d.progress || '', summary: d.summary || '',
      feeling: d.feeling || '', rating: d.rating || 0, spoiler: !!d.spoiler, tags: d.tags || [], note: d.note || '', images: d.images || [] });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={story ? '编辑剧情' : '记剧情'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <SelectField label="类型" value={d.type || 'main'} onChange={v => setD({ ...d, type: v as any })}
        options={Object.entries(STORY_TYPE).map(([value, label]) => ({ value, label }))} />
      <TextInput label="标题" value={d.title || ''} onChange={v => setD({ ...d, title: v })} />
      <TextInput label="章节/版本" value={d.chapter || ''} onChange={v => setD({ ...d, chapter: v })} />
      <SelectField label="状态" value={d.status || 'unwatch'} onChange={v => setD({ ...d, status: v as any })}
        options={Object.entries(STORY_STATUS).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-2 gap-3">
        <DateInput label="开始" value={d.startDate || ''} onChange={v => setD({ ...d, startDate: v })} />
        <DateInput label="完成" value={d.endDate || ''} onChange={v => setD({ ...d, endDate: v })} />
      </div>
      <NumInput label="评分(1-5)" value={d.rating ?? 0} onChange={v => setD({ ...d, rating: v })} />
      <AreaInput label="剧情梗概" value={d.summary || ''} onChange={v => setD({ ...d, summary: v })} />
      <AreaInput label="个人感想" value={d.feeling || ''} onChange={v => setD({ ...d, feeling: v })} />
      <MultiImageField label="剧情截图（可多张）" value={d.images || []} onChange={v => setD({ ...d, images: v })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.spoiler} onChange={e => setD({ ...d, spoiler: e.target.checked })} /> 含剧透（折叠）</label>
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

export function CardEditor({ open, onOpenChange, gameId, card, stories, accounts }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string; card: Card | null; stories: { id: string; title: string }[]; accounts: { id: string; name: string }[];
}) {
  const [d, setD] = useState<Partial<Card>>({});
  useEffect(() => {
    if (!open) return;
    if (card) setD({ ...card });
    else setD({ name: '', character: '', rarity: 'SSR', owned: true, obtainWay: '', obtainDate: '', images: [], coverImg: undefined, storyId: null, accountId: null, accountNote: '', awaken: 0 });
  }, [open, card]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写卡面名'); return; }
    const now = Date.now();
    const payload: any = { ...d, images: d.images && d.images.length ? d.images : (d.coverImg ? [d.coverImg] : []), updatedAt: now };
    if (card) await db.cards.update(card.id, payload);
    else await db.cards.add({ id: uid(), gameId, createdAt: now, updatedAt: now, deletedAt: null,
      name: d.name!, character: d.character || '', rarity: d.rarity || 'SSR', owned: !!d.owned, obtainWay: d.obtainWay || '', obtainDate: d.obtainDate || '',
      images: payload.images, coverImg: payload.images[0], storyId: d.storyId ?? null, accountId: d.accountId ?? null, accountNote: d.accountNote || '', awaken: d.awaken ?? 0 });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={card ? '编辑卡面' : '添加卡面'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="卡面名称" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <TextInput label="角色" value={d.character || ''} onChange={v => setD({ ...d, character: v })} />
      <SelectField label="稀有度" value={d.rarity || 'SSR'} onChange={v => setD({ ...d, rarity: v })}
        options={RARITY_OPTIONS} />
      <MultiImageField label="卡面图片（可多张）" value={d.images || []} onChange={v => setD({ ...d, images: v })} max={9} />
      <NumInput label="觉醒 / 突破（阶数，0=未突破）" value={d.awaken ?? 0} onChange={v => setD({ ...d, awaken: v })} />
      <SelectField label="联动剧情" value={d.storyId || ''} onChange={v => setD({ ...d, storyId: v || null })}
        options={[{ value: '', label: '不关联' }, ...stories.map(s => ({ value: s.id, label: s.title }))]} />
      <SelectField label="所属账号" value={d.accountId || ''} onChange={v => setD({ ...d, accountId: v || null })}
        options={[{ value: '', label: '不指定' }, ...accounts.map(a => ({ value: a.id, label: a.name }))]} />
      {accounts.length > 0 && (
        <TextInput label="账号备注（如：该卡由某号拥有）" value={d.accountNote || ''} onChange={v => setD({ ...d, accountNote: v })} />
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.owned} onChange={e => setD({ ...d, owned: e.target.checked })} /> 已拥有</label>
      <TextInput label="获取方式" value={d.obtainWay || ''} onChange={v => setD({ ...d, obtainWay: v })} />
      <DateInput label="获得日期" value={d.obtainDate || ''} onChange={v => setD({ ...d, obtainDate: v })} />
    </EditorModal>
  );
}

export function MaterialEditor({ open, onOpenChange, starId, material }: {
  open: boolean; onOpenChange: (v: boolean) => void; starId: string; material: Material | null;
}) {
  const [d, setD] = useState<any>({});
  useEffect(() => {
    if (open) setD(material ? { ...material } : { type: 'mv', title: '', album: '', episode: '', date: '', platform: '', url: '', duration: 0, status: 'want', rating: 0, feeling: '', highlight: '', member: '', progress: '', tags: [], note: '', images: [] });
  }, [open, material]);
  const save = async () => {
    if (!d.title?.trim()) { toast.error('请填写标题'); return; }
    const now = Date.now();
    if (material) await db.materials.update(material.id, { ...d, updatedAt: now });
    else await db.materials.add({ id: uid(), starId, createdAt: now, updatedAt: now, deletedAt: null, ...d, images: d.images || [] });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={material ? '编辑物料' : '记物料'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <SelectField label="类型" value={d.type || 'mv'} onChange={v => setD({ ...d, type: v })} options={Object.entries(MATERIAL_TYPE).map(([value, label]) => ({ value, label }))} />
      <LinkField label="链接（自动带出标题/平台）" value={d.url || ''} onChange={v => setD({ ...d, url: v })} onResolved={r => setD({ ...d, title: r.title || d.title, platform: r.platform })} />
      <TextInput label="标题" value={d.title || ''} onChange={v => setD({ ...d, title: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="所属专辑/节目" value={d.album || ''} onChange={v => setD({ ...d, album: v })} />
        <TextInput label="期数/集数" value={d.episode || ''} onChange={v => setD({ ...d, episode: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="状态" value={d.status || 'want'} onChange={v => setD({ ...d, status: v })} options={Object.entries(MATERIAL_STATUS).map(([value, label]) => ({ value, label }))} />
        <DateInput label="日期" value={d.date || ''} onChange={v => setD({ ...d, date: v })} />
      </div>
      <TextInput label="平台" value={d.platform || ''} onChange={v => setD({ ...d, platform: v })} />
      <NumInput label="时长(分钟)" value={d.duration ?? 0} onChange={v => setD({ ...d, duration: v })} />
      <AreaInput label="感想/名场面" value={d.feeling || ''} onChange={v => setD({ ...d, feeling: v })} />
      <AreaInput label="高光成员" value={d.member || ''} onChange={v => setD({ ...d, member: v })} />
      <MultiImageField label="物料截图（可多张）" value={d.images || []} onChange={v => setD({ ...d, images: v })} />
    </EditorModal>
  );
}

export function PhotocardEditor({ open, onOpenChange, starId, photocard }: {
  open: boolean; onOpenChange: (v: boolean) => void; starId: string; photocard: Photocard | null;
}) {
  const [d, setD] = useState<any>({});
  useEffect(() => {
    if (open) setD(photocard ? { ...photocard } : { album: '', name: '', kind: 'album', rarity: '', total: 1, owned: 1, dup: 0, photo: '', note: '' });
  }, [open, photocard]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写卡名'); return; }
    const now = Date.now();
    if (photocard) await db.photocards.update(photocard.id, { ...d, updatedAt: now });
    else await db.photocards.add({ id: uid(), starId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={photocard ? '编辑小卡' : '加小卡'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="卡名" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <TextInput label="专辑/批次" value={d.album || ''} onChange={v => setD({ ...d, album: v })} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="类型" value={d.kind || 'album'} onChange={v => setD({ ...d, kind: v })} options={Object.entries({ album: '专辑', single: '单曲', event: '活动', preorder: '预售', goods: '特典', other: '其他' }).map(([value, label]) => ({ value, label }))} />
        <TextInput label="稀有度（可选）" value={d.rarity || ''} onChange={v => setD({ ...d, rarity: v })} placeholder="可不填" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="总拥有" value={d.total ?? 1} onChange={v => setD({ ...d, total: v })} />
        <NumInput label="不同款" value={d.owned ?? 1} onChange={v => setD({ ...d, owned: v })} />
        <NumInput label="重复" value={d.dup ?? 0} onChange={v => setD({ ...d, dup: v })} />
      </div>
      <ImageField label="卡片图片" value={d.photo} onChange={v => setD({ ...d, photo: v })} />
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}
