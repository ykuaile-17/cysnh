import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search as SearchIcon, X } from 'lucide-react';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Empty, Pill } from '@/components/common';
import { GAME_STATUS, NOVEL_STATUS, MERCH_STATUS, STAR_STATUS } from '@/lib/format';

export default function Search() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');

  const all = useLiveQuery(async () => {
    const [games, stars, novels, merch, stories, materials, schedules, notes, excerpts, chars, orders, sales, reminders] = await Promise.all([
      db.games.filter(g => !g.deletedAt).toArray(),
      db.stars.filter(s => !s.deletedAt).toArray(),
      db.novels.filter(n => !n.deletedAt).toArray(),
      db.merch.filter(m => !m.deletedAt).toArray(),
      db.gameStories.filter(s => !s.deletedAt).toArray(),
      db.materials.filter(m => !m.deletedAt).toArray(),
      db.schedules.filter(s => !s.deletedAt).toArray(),
      db.notes.filter(n => !n.deletedAt).toArray(),
      db.excerpts.filter(e => !e.deletedAt).toArray(),
      db.characters.filter(c => !c.deletedAt).toArray(),
      db.orders.filter(o => !o.deletedAt).toArray(),
      db.sales.filter(s => !s.deletedAt).toArray(),
      db.reminders.filter(r => !r.deletedAt).toArray(),
    ]);
    return { games, stars, novels, merch, stories, materials, schedules, notes, excerpts, chars, orders, sales, reminders };
  }, [], undefined);

  const results = useMemo(() => {
    if (!all || !q.trim()) return [];
    const kw = q.trim().toLowerCase();
    const match = (...fields: (string | undefined)[]) => fields.some(f => (f || '').toLowerCase().includes(kw));
    const list: { group: string; title: string; sub: string; to: string }[] = [];
    if (scope === 'all' || scope === 'game') {
      all.games.filter(g => match(g.name, g.note, g.type, g.platform)).forEach(g => list.push({ group: '游戏', title: g.name, sub: GAME_STATUS[g.status], to: `/games/${g.id}` }));
      all.stories.filter(s => match(s.title, s.chapter, s.summary, s.feeling)).forEach(s => list.push({ group: '剧情', title: s.title, sub: s.chapter, to: `/games/${s.gameId}` }));
    }
    if (scope === 'all' || scope === 'star') {
      all.stars.filter(s => match(s.name, s.alias, s.note, s.reason)).forEach(s => list.push({ group: '追星', title: s.name, sub: STAR_STATUS[s.status], to: `/stars/${s.id}` }));
      all.materials.filter(m => match(m.title, m.album, m.feeling, m.highlight)).forEach(m => list.push({ group: '物料', title: m.title, sub: m.album, to: `/stars/${m.starId}` }));
      all.schedules.filter(s => match(s.title, s.city, s.venue, s.repo)).forEach(s => list.push({ group: '行程', title: s.title, sub: s.city, to: `/stars/${s.starId}` }));
    }
    if (scope === 'all' || scope === 'novel') {
      all.novels.filter(n => match(n.title, n.author, n.note, n.tags?.join(','))).forEach(n => list.push({ group: '小说', title: n.title, sub: `${n.author} · ${NOVEL_STATUS[n.status]}`, to: `/novels/${n.id}` }));
      all.notes.filter(n => match(n.title, n.content, n.chapter)).forEach(n => list.push({ group: '笔记', title: n.title || '笔记', sub: n.content.slice(0, 20), to: `/novels/${n.novelId}` }));
      all.excerpts.filter(e => match(e.content, e.source, e.feeling)).forEach(e => list.push({ group: '摘抄', title: e.content.slice(0, 20), sub: e.source, to: `/novels/${e.novelId}` }));
      all.chars.filter(c => match(c.name, c.identity, c.ending)).forEach(c => list.push({ group: '角色', title: c.name, sub: c.type, to: `/novels/${c.novelId}` }));
    }
    if (scope === 'all' || scope === 'merch') {
      all.merch.filter(m => match(m.name, m.ip, m.character, m.note, m.orderNo, m.location)).forEach(m => list.push({ group: '周边', title: m.name, sub: `${m.ip} · ${MERCH_STATUS[m.status]}`, to: `/merch/${m.id}` }));
      all.orders.filter(o => match(o.name, o.orderNo, o.ip, o.shop)).forEach(o => list.push({ group: '订单', title: o.name, sub: o.orderNo, to: `/merch` }));
      all.sales.filter(s => match(s.buyer, s.platform, s.reason, s.note)).forEach(s => list.push({ group: '出物', title: s.buyer || '出物', sub: s.platform, to: `/merch` }));
    }
    if (scope === 'all' || scope === 'reminder') {
      all.reminders.filter(r => match(r.title, r.note, r.type)).forEach(r => list.push({ group: '提醒', title: r.title, sub: r.type, to: `/reminders` }));
    }
    return list.slice(0, 60);
  }, [all, q, scope]);

  const scopes = [{ v: 'all', l: '全部' }, { v: 'game', l: '游戏' }, { v: 'star', l: '追星' }, { v: 'novel', l: '小说' }, { v: 'merch', l: '周边' }, { v: 'reminder', l: '提醒' }];

  return (
    <div>
      <div className="sticky top-[53px] z-20 flex items-center gap-2 border-b bg-background/90 px-3 py-2.5 backdrop-blur">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="搜遍所有记录…" className="h-10 pl-10 pr-9" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="size-4" /></button>}
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 text-xs">
        {scopes.map(s => (
          <button key={s.v} onClick={() => setScope(s.v)}
            className={`shrink-0 rounded-full px-3 py-1 ${scope === s.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s.l}</button>
        ))}
      </div>

      {!q.trim() ? (
        <Empty icon="🔍" text="输入关键词，搜游戏/追星/小说/周边/提醒" />
      ) : results.length === 0 ? (
        <Empty icon="🫥" text={`没有找到与“${q}”相关的内容`} />
      ) : (
        <div className="flex flex-col gap-1 px-3">
          {results.map((r, i) => (
            <button key={i} onClick={() => navigate(r.to)}
              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left active:scale-[0.99]">
              <Pill>{r.group}</Pill>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="h-4" />
    </div>
  );
}
