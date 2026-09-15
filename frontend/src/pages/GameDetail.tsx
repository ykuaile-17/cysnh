import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Pencil, ArrowLeft, Dices, BookText, Grid3x3, BarChart3, Settings as SettingsIcon, X, UserCircle2, Shirt, Wallet } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Game, GameStory, GachaRecord, GachaItem, Card, GachaPool, GameAccount, GameTopup, Wardrobe } from '@/lib/types';
import { logHistory } from '@/lib/history';
import {
  GAME_STATUS, STORY_STATUS, STORY_TYPE, POOL_TYPE, RARITY_COLOR, RARITY_OPTIONS,
  fmtNum, fmtDate, fmtMoney,
} from '@/lib/format';
import { gachaStats, monthlyTrend } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader, Empty, Pill, StatCard } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, AreaInput, NumInput, ImageField, MultiImageField } from '@/components/form';
import { ZoomableImage, ImageStrip } from '@/components/ImageViewer';
import { StoryEditor, CardEditor } from '@/components/editors';
import { toast } from 'sonner';

const cn = (...a: any[]) => a.filter(Boolean).join(' ');

export default function GameDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const game = useLiveQuery(() => db.games.get(id), [id]);
  const stories = useLiveQuery(() => db.gameStories.where('gameId').equals(id).filter(s => !s.deletedAt).toArray(), [id]) || [];
  const pools = useLiveQuery(() => db.gachaPools.where('gameId').equals(id).filter(p => !p.deletedAt).toArray(), [id]) || [];
  const records = useLiveQuery(() => db.gachaRecords.where('gameId').equals(id).filter(r => !r.deletedAt).toArray(), [id]) || [];
  const items = useLiveQuery(async () => {
    const recIds = records.map(r => r.id);
    if (!recIds.length) return [] as GachaItem[];
    const all = await db.gachaItems.toArray();
    return all.filter(i => recIds.includes(i.recordId));
  }, [records]) || [];
  const cards = useLiveQuery(() => db.cards.where('gameId').equals(id).filter(c => !c.deletedAt).toArray(), [id]) || [];
  const accounts = useLiveQuery(() => db.accounts.where('gameId').equals(id).filter(a => !a.deletedAt).toArray(), [id]) || [];
  const topups = useLiveQuery(() => db.topups.where('gameId').equals(id).filter(t => !t.deletedAt).toArray(), [id]) || [];
  const wardrobe = useLiveQuery(() => db.wardrobe.where('gameId').equals(id).filter(w => !w.deletedAt).toArray(), [id]) || [];

  const [storyOpen, setStoryOpen] = useState(false);
  const [gachaOpen, setGachaOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [wardOpen, setWardOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<GameStory | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editingTopup, setEditingTopup] = useState<GameTopup | null>(null);
  const [editingWard, setEditingWard] = useState<Wardrobe | null>(null);
  const [editingAcct, setEditingAcct] = useState<GameAccount | null>(null);

  useEffect(() => {
    const add = params.get('add');
    if (add === 'story') { setEditingStory(null); setStoryOpen(true); setParams({}, { replace: true }); }
    if (add === 'gacha') { setGachaOpen(true); setParams({}, { replace: true }); }
    const ec = params.get('editCard');
    if (ec) { db.cards.get(ec).then(c => { if (c) { setEditingCard(c); setCardOpen(true); } }); setParams({}, { replace: true }); }
    const es = params.get('editStory');
    if (es) { db.gameStories.get(es).then(s => { if (s) { setEditingStory(s); setStoryOpen(true); } }); setParams({}, { replace: true }); }
  }, [params, setParams]);

  if (!game) return <Empty icon="⏳" text="加载中…" />;

  // 按卡池独立计算垫抽（同一游戏的不同卡池互不影响）
  const pityByPool: Record<string, number> = {};
  [...records].sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)).forEach(r => {
    if (!r.poolId) return;
    if (pityByPool[r.poolId] === undefined) pityByPool[r.poolId] = 0;
    pityByPool[r.poolId] += r.pulls;
    const outs = items.filter(i => i.recordId === r.id && i.isOut);
    if (outs.length) pityByPool[r.poolId] = 0;
  });
  // 当前卡池：最近一条有卡池的记录的卡池；否则最近新建的卡池
  const lastRecPool = [...records].sort((a, b) => +new Date(b.datetime) - +new Date(a.datetime)).find(r => r.poolId);
  const currentPool = pools.find(p => p.id === lastRecPool?.poolId)
    || [...pools].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  const curPity = currentPool ? (pityByPool[currentPool.id] || 0) : 0;
  const curPityBase = currentPool?.pityHard || 0;

  const gs = gachaStats(records, items);
  const outCount = items.filter(i => i.isOut).length;
  const storyMap = Object.fromEntries(stories.map(s => [s.id, s]));
  const acctMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{game.coverImg ? <img src={game.coverImg} className="size-6 rounded" alt="" /> : <span className="text-xl">{game.cover}</span>}{game.name}</span>}
        onBack={() => navigate('/games')}
        subtitle={`${GAME_STATUS[game.status]} · ${game.progress || '暂无进度'}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => navigate(`/games?edit=${game.id}`)}><Pencil className="size-4" /></Button>}
      />

      <Tabs defaultValue="overview" className="px-3 pt-3">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="story">剧情</TabsTrigger>
          <TabsTrigger value="gacha">抽卡</TabsTrigger>
          <TabsTrigger value="gallery">图鉴</TabsTrigger>
          <TabsTrigger value="account">账号</TabsTrigger>
          <TabsTrigger value="topup">氪金</TabsTrigger>
          <TabsTrigger value="wardrobe">衣柜</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="剧情" value={`${stories.length} 条`} />
            <StatCard label="总抽数" value={`${fmtNum(gs.totalPulls)}`} accent="text-primary" />
            <StatCard label="出货" value={`${outCount} 张`} />
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">{currentPool ? `当前卡池：${currentPool.name}` : '当前垫抽'}</p>
            <p className="text-2xl font-bold">{curPity} <span className="text-sm font-normal text-muted-foreground">/ 保底 {curPityBase || '—'}</span></p>
            {curPityBase > 0 && curPity >= curPityBase - 10 && <p className="mt-1 text-xs text-amber-500">快保底了，冲！</p>}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => navigate(`/games/${id}?add=story`)}><BookText className="size-4" /> 记剧情</Button>
            <Button className="flex-1" variant="secondary" onClick={() => setGachaOpen(true)}><Dices className="size-4" /> 记抽卡</Button>
          </div>
        </TabsContent>

        {/* 剧情 */}
        <TabsContent value="story" className="flex flex-col gap-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingStory(null); setStoryOpen(true); }}><Plus className="size-4" /> 添加</Button>
          </div>
          {stories.length === 0 ? <Empty icon="📜" text="还没有剧情记录" /> : stories.map(s => {
            const linked = cards.filter(c => c.storyId === s.id);
            return (
            <div key={s.id} onClick={() => navigate(`/games/${id}/stories/${s.id}`)}
              className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.title}</span>
                <Pill>{STORY_TYPE[s.type]}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.chapter} · {STORY_STATUS[s.status]}{s.rating ? ` · ${'★'.repeat(s.rating)}` : ''}</p>
              {s.images && s.images.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {s.images.map((img, i) => (
                    <ZoomableImage key={i} src={img} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted/40" imgClassName="h-16 w-16 object-cover" />
                  ))}
                </div>
              )}
              {linked.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <p className="mb-1 text-[11px] text-muted-foreground">关联卡面（{linked.length}）</p>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {linked.map(c => (
                      <button key={c.id} onClick={(e) => { e.stopPropagation(); navigate(`/games/${id}/cards/${c.id}`); }}
                        className="shrink-0 rounded-lg border bg-muted/40 p-1 text-center">
                        {c.coverImg ? <img src={c.coverImg} className="size-12 rounded object-cover" alt="" /> : <span className="block size-12 text-[10px] leading-tight flex items-center justify-center">{c.name}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {s.spoiler && <span className="mt-1 inline-block rounded bg-destructive/10 px-1.5 text-[11px] text-destructive">含剧透</span>}
            </div>
            );
          })}
        </TabsContent>

        {/* 抽卡 */}
        <TabsContent value="gacha" className="flex flex-col gap-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setGachaOpen(true)}><Plus className="size-4" /> 记抽卡</Button>
          </div>
          {records.length === 0 ? <Empty icon="🎲" text="还没有抽卡记录" /> : (
            <div className="flex flex-col gap-2">
              {[...records].sort((a, b) => +new Date(b.datetime) - +new Date(a.datetime)).map(r => {
                const its = items.filter(i => i.recordId === r.id);
                const pool = pools.find(p => p.id === r.poolId);
                return (
                  <div key={r.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pool?.name || '未知卡池'}</span>
                      <span className="text-muted-foreground">{fmtDate(r.datetime)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{POOL_TYPE[pool?.type || 'other']} · {r.pulls} 抽 · {fmtMoney(r.costAmount)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {its.map(i => (
                        <span key={i.id} className="rounded px-1.5 py-0.5 text-xs"
                          style={{ background: `${RARITY_COLOR[i.rarity] || '#999'}22`, color: RARITY_COLOR[i.rarity] || '#666' }}>
                          {i.rarity} {i.cardName}{i.isMiss ? ' (歪)' : ''}
                        </span>
                      ))}
                    </div>
                    {r.images && r.images.length > 0 && (
                      <div className="mt-2 flex gap-1.5 overflow-x-auto">
                        {r.images.map((img, i) => (
                          <ZoomableImage key={i} src={img} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted/40" imgClassName="h-16 w-16 object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 图鉴 */}
        <TabsContent value="gallery" className="flex flex-col gap-2">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)}><Plus className="size-4" /> 批量添加</Button>
            <Button size="sm" onClick={() => { setEditingCard(null); setCardOpen(true); }}><Plus className="size-4" /> 添加卡面</Button>
          </div>
          {cards.length === 0 ? <Empty icon="🃏" text="图鉴还是空的" /> : (
            <div className="grid grid-cols-2 gap-2">
              {cards.map(c => (
                <div key={c.id} onClick={() => navigate(`/games/${id}/cards/${c.id}`)}
                  className={cn('rounded-xl border p-3', c.owned ? 'bg-card' : 'bg-muted/40 opacity-70')}>
                  {c.images && c.images.length ? (
                    <ImageStrip images={c.images} h={24} />
                  ) : c.coverImg ? (
                    <ZoomableImage src={c.coverImg} className="mb-2 block h-24 w-full overflow-hidden rounded" imgClassName="h-24 w-full object-cover" />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="text-xs" style={{ color: RARITY_COLOR[c.rarity] || '#666' }}>{c.rarity}</span>
                  </div>
                  {c.awaken ? <p className="text-[11px] text-primary">觉醒 / 突破 {c.awaken} 阶</p> : null}
                  <p className="text-xs text-muted-foreground">{c.character}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Pill color={c.owned ? '#22c55e' : '#94a3b8'}>{c.owned ? '已拥有' : '未拥有'}</Pill>
                    {(() => { const sid = c.storyId; const st = sid ? storyMap[sid] : null; if (!st) return null;
                      return (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/games/${id}/stories/${st.id}`); }}>
                        <Pill color="#7c5cff">联动：{st.title}</Pill>
                      </button>
                      );
                    })()}
                    {c.accountId && acctMap[c.accountId] && <Pill color="#f59e0b">@{acctMap[c.accountId].name}</Pill>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 账号 */}
        <TabsContent value="account" className="flex flex-col gap-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingAcct(null); setAcctOpen(true); }}><Plus className="size-4" /> 添加账号</Button>
          </div>
          {accounts.length === 0 ? <Empty icon="🎮" text="还没有记录游戏账号" /> : accounts.map(a => (
            <div key={a.id} onClick={() => { setEditingAcct(a); setAcctOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-1.5"><UserCircle2 className="size-4" />{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.server}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">UID：{a.uid}{a.role ? ` · ${a.role}` : ''}</p>
              {a.note && <p className="mt-1 text-xs text-muted-foreground">备注：{a.note}</p>}
            </div>
          ))}
        </TabsContent>

        {/* 氪金 */}
        <TabsContent value="topup" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="累计氪金" value={fmtMoney(topups.reduce((s, t) => s + (t.amount || 0), 0))} accent="text-destructive" />
            <StatCard label="次数" value={topups.length} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingTopup(null); setTopupOpen(true); }}><Plus className="size-4" /> 记氪金</Button>
          </div>
          {topups.length === 0 ? <Empty icon="💎" text="还没有氪金记录" /> : [...topups].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map(t => (
            <div key={t.id} onClick={() => { setEditingTopup(t); setTopupOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{fmtMoney(t.amount)}</span>
                <span className="text-muted-foreground">{fmtDate(t.date)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.channel || '未知渠道'}{t.note ? ' · ' + t.note : ''}</p>
              {t.image && <div className="mt-2"><ZoomableImage src={t.image} className="block h-20 w-20 overflow-hidden rounded-lg border bg-muted/40" imgClassName="h-20 w-20 object-cover" /></div>}
            </div>
          ))}
        </TabsContent>

        {/* 衣柜 */}
        <TabsContent value="wardrobe" className="flex flex-col gap-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingWard(null); setWardOpen(true); }}><Plus className="size-4" /> 加衣柜</Button>
          </div>
          {wardrobe.length === 0 ? <Empty icon="👗" text="还没有衣橱收集" /> : wardrobe.map(w => (
            <div key={w.id} onClick={() => { setEditingWard(w); setWardOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              {w.images && w.images.length > 0 && <ImageStrip images={w.images} h={20} />}
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{w.name}</span>
                <span className="text-xs" style={{ color: RARITY_COLOR[w.rarity] || '#666' }}>{w.rarity}</span>
              </div>
              <p className="text-xs text-muted-foreground">{w.kind} · {w.owned ? '已拥有' : '未拥有'}</p>
            </div>
          ))}
        </TabsContent>

        {/* 统计 */}
        <TabsContent value="stats" className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="总抽数" value={fmtNum(gs.totalPulls)} />
            <StatCard label="总出货" value={outCount} />
            <StatCard label="出货率" value={`${gs.rate.toFixed(1)}%`} accent="text-primary" />
            <StatCard label="UP命中率" value={`${gs.upRate.toFixed(1)}%`} />
            <StatCard label="歪率" value={`${gs.missRate.toFixed(1)}%`} />
            <StatCard label="平均出货抽数" value={gs.avgPull.toFixed(1)} />
          </div>
          <BarChart title="月度抽卡趋势" data={monthlyTrend(records, r => r.pulls, 6).map(d => ({ ...d, value: d.value }))} color="#7c5cff" />
        </TabsContent>

        {/* 设置 */}
        <TabsContent value="settings" className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => navigate(`/games?edit=${game.id}`)}><SettingsIcon className="size-4" /> 编辑游戏</Button>
          <Button variant="outline" onClick={() => { db.games.update(id, { archived: !game.archived, updatedAt: Date.now() }); toast(game.archived ? '已取消归档' : '已归档'); }}>
            {game.archived ? '取消归档' : '归档'}
          </Button>
          <Button variant="destructive" onClick={() => { softDelete(db.games, id); logHistory('games', id, game.name, 'delete', game, null); toast('已移到回收站'); navigate('/games'); }}>删除（回收站）</Button>
        </TabsContent>
      </Tabs>
      <div className="h-4" />

      <StoryEditor open={storyOpen} onOpenChange={setStoryOpen} gameId={id} story={editingStory} />
      <GachaEditor open={gachaOpen} onOpenChange={setGachaOpen} gameId={id} pools={pools} />
      <CardEditor open={cardOpen} onOpenChange={setCardOpen} gameId={id} card={editingCard} stories={stories} accounts={accounts} />
      <BatchCardModal open={batchOpen} onOpenChange={setBatchOpen} gameId={id} />
      <TopupEditor open={topupOpen} onOpenChange={setTopupOpen} gameId={id} topup={editingTopup} />
      <WardrobeEditor open={wardOpen} onOpenChange={setWardOpen} gameId={id} wardrobe={editingWard} />
      <AccountEditor open={acctOpen} onOpenChange={setAcctOpen} gameId={id} account={editingAcct} />
    </div>
  );
}

function BarChart({ title, data, color }: { title: string; data: { month: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="flex items-end gap-2" style={{ height: 100 }}>
        {data.map(d => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center" style={{ height: 80 }}>
              <div className="w-full rounded-t bg-primary/70" style={{ height: `${(d.value / max) * 80}px`, background: color }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GachaEditor({ open, onOpenChange, gameId, pools }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string; pools: GachaPool[];
}) {
  const [poolId, setPoolId] = useState('');
  const [datetime, setDatetime] = useState(new Date().toISOString().slice(0, 10));
  const [pulls, setPulls] = useState(10);
  const [costType, setCostType] = useState('');
  const [costAmount, setCostAmount] = useState(0);
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [rows, setRows] = useState<{ cardName: string; character: string; rarity: string; isUp: boolean; isOut: boolean; isMiss: boolean; pullIndex: number }[]>([]);
  const [showNewPool, setShowNewPool] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [newPoolType, setNewPoolType] = useState('limited');
  const [newPoolPity, setNewPoolPity] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);

  useEffect(() => { if (open) { setPoolId(pools[0]?.id || ''); setRows([]); setPulls(10); setCostAmount(0); setCostType(''); setNote(''); setImages([]); setShowNewPool(false); setNewPoolName(''); setOcrText(''); } }, [open, pools]);

  const createPool = async () => {
    if (!newPoolName.trim()) { toast.error('请填写卡池名'); return; }
    const now = Date.now();
    const pid = uid();
    await db.gachaPools.add({ id: pid, gameId, name: newPoolName.trim(), type: (newPoolType as any) || 'other', startDate: '', endDate: '', pityHard: newPoolPity || undefined, pitySoft: undefined, createdAt: now, updatedAt: now, deletedAt: null });
    setPoolId(pid); setShowNewPool(false); setNewPoolName(''); setNewPoolPity(0);
    toast.success('已新建卡池');
  };

  const runOcr = async () => {
    setOcrBusy(true);
    try {
      const { ocrImage, extractNumbers, extractAmount } = await import('@/lib/ocr');
      const url = await new Promise<string>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = () => { const f = input.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(f); };
        input.click();
      });
      const text = await ocrImage(url, () => {});
      setOcrText(text);
      const nums = extractNumbers(text);
      if (nums.length) setPulls(nums[0]);
      const amt = extractAmount(text);
      if (amt) { setCostAmount(amt); setCostType('原石'); }
      toast.success('已识别，请核对');
    } catch { toast.error('识别失败'); }
    finally { setOcrBusy(false); }
  };

  const addRow = () => setRows([...rows, { cardName: '', character: '', rarity: 'SR', isUp: false, isOut: true, isMiss: false, pullIndex: rows.length + 1 }]);
  const updRow = (i: number, patch: any) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const save = async () => {
    if (pulls <= 0) { toast.error('抽数必须大于0'); return; }
    const now = Date.now();
    const recId = uid();
    const rec: any = { id: recId, gameId, poolId: poolId || null, datetime, pulls, costType, costAmount, note, images, createdAt: now, updatedAt: now, deletedAt: null };
    await db.gachaRecords.add(rec);
    if (rows.length) {
      await db.gachaItems.bulkAdd(rows.map(r => ({ id: uid(), recordId: recId, cardName: r.cardName, character: r.character, rarity: r.rarity, isUp: r.isUp, isOut: r.isOut, pullIndex: r.pullIndex, isGuaranteed: false, isMiss: r.isMiss })));
    }
    logHistory('gachaRecords', recId, `${datetime} 抽卡${pulls}次`, 'create', null, rec);
    toast.success('已记录抽卡'); onOpenChange(false);
  };

  return (
    <EditorModal title="记抽卡" open={open} onOpenChange={onOpenChange} onSave={save}>
      <div className="flex items-end gap-2">
        <SelectField label="卡池" value={poolId} onChange={setPoolId}
          options={pools.length ? pools.map(p => ({ value: p.id, label: p.name })) : [{ value: '', label: '（暂无卡池）' }]} />
        <Button type="button" variant="outline" size="sm" className="mb-1 shrink-0" onClick={() => setShowNewPool(v => !v)}><Plus className="size-3.5" /> 新建</Button>
      </div>
      {showNewPool && (
        <div className="rounded-lg border p-2">
          <TextInput label="卡池名称" value={newPoolName} onChange={setNewPoolName} placeholder="如：限定UP·星之少女" />
          <SelectField label="类型" value={newPoolType} onChange={setNewPoolType}
            options={Object.entries(POOL_TYPE).map(([value, label]) => ({ value, label }))} />
          <NumInput label="硬保底抽数（可选）" value={newPoolPity} onChange={setNewPoolPity} placeholder="如：90" />
          <Button type="button" size="sm" className="w-full" onClick={createPool}>保存卡池</Button>
        </div>
      )}
      <DateInput label="日期" value={datetime} onChange={setDatetime} />
      <NumInput label="抽数" value={pulls} onChange={setPulls} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="消耗资源" value={costType} onChange={setCostType} placeholder="如：原石" />
        <NumInput label="消耗数量" value={costAmount} onChange={setCostAmount} />
      </div>
      <AreaInput label="备注" value={note} onChange={setNote} />
      <MultiImageField label="抽卡截图（可多张）" value={images} onChange={setImages} max={6} />

      <div className="rounded-lg border bg-muted/30 p-2">
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={runOcr} disabled={ocrBusy}>
          {ocrBusy ? '识别中…' : '📷 从抽卡截图识别'}
        </Button>
        {ocrText && <p className="mt-1 max-h-24 overflow-auto text-[11px] text-muted-foreground">{ocrText}</p>}
      </div>

      <div className="mt-1 border-t pt-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium">出货明细</span>
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="size-3.5" /> 加一行</Button>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="mb-2 rounded-lg border p-2">
            <div className="flex items-center gap-1">
              <Input value={r.cardName} onChange={e => updRow(i, { cardName: e.target.value })} placeholder="卡面名" className="h-8 flex-1 text-sm" />
              <select value={r.rarity} onChange={e => updRow(i, { rarity: e.target.value })} className="h-8 rounded border bg-transparent px-1 text-sm">
                {RARITY_OPTIONS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
              <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-destructive"><X className="size-4" /></button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <label className="flex items-center gap-1"><input type="checkbox" checked={r.isOut} onChange={e => updRow(i, { isOut: e.target.checked })} /> 出货</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={r.isUp} onChange={e => updRow(i, { isUp: e.target.checked })} /> 当期UP</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={r.isMiss} onChange={e => updRow(i, { isMiss: e.target.checked })} /> 歪了</label>
            </div>
          </div>
        ))}
      </div>
    </EditorModal>
  );
}

function BatchCardModal({ open, onOpenChange, gameId }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string;
}) {
  const [text, setText] = useState('');
  const save = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error('请每行填写一张卡面'); return; }
    const now = Date.now();
    const created = lines.map(line => {
      // 支持「卡名-角色 / 卡名，角色 / 卡名 角色」分隔
      const parts = line.split(/[-,，/、\s]+/).map(p => p.trim()).filter(Boolean);
      const name = parts[0] || line;
      const character = parts.slice(1).join(' ') || '';
      return { id: uid(), gameId, createdAt: now, updatedAt: now, deletedAt: null,
        name, character, rarity: '', owned: false, obtainWay: '', obtainDate: '', images: [], coverImg: undefined, storyId: null, accountId: null, accountNote: '' };
    });
    await db.cards.bulkAdd(created);
    toast.success(`已添加 ${created.length} 张卡面，可点进去补全信息`);
    setText(''); onOpenChange(false);
  };
  return (
    <EditorModal title="批量添加卡面" open={open} onOpenChange={onOpenChange} onSave={save}>
      <p className="text-xs text-muted-foreground">每行一张卡面，可用「- / ，、空格」分隔卡名与角色，例如：<br />星之少女-莉莉<br />炎之骑士 凯</p>
      <AreaInput label="卡面清单" value={text} onChange={setText} placeholder={'星之少女\n炎之骑士-凯\n深渊之王'} rows={6} />
    </EditorModal>
  );
}

function TopupEditor({ open, onOpenChange, gameId, topup }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string; topup: GameTopup | null;
}) {
  const [d, setD] = useState<Partial<GameTopup>>({});
  useEffect(() => {
    if (open) setD(topup ? { ...topup } : { date: new Date().toISOString().slice(0, 10), amount: 0, currency: 'CNY', channel: '', image: '', note: '' });
  }, [open, topup]);
  const save = async () => {
    const now = Date.now();
    if (topup) await db.topups.update(topup.id, { ...d, updatedAt: now });
    else await db.topups.add({ id: uid(), gameId, createdAt: now, updatedAt: now, deletedAt: null,
      date: d.date || '', amount: d.amount || 0, currency: d.currency || 'CNY', channel: d.channel || '', image: d.image || '', note: d.note || '' });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={topup ? '编辑氪金' : '记氪金'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <DateInput label="日期" value={d.date || ''} onChange={v => setD({ ...d, date: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="金额" value={d.amount ?? 0} onChange={v => setD({ ...d, amount: v })} />
        <TextInput label="货币" value={d.currency || ''} onChange={v => setD({ ...d, currency: v })} placeholder="CNY" />
      </div>
      <TextInput label="渠道" value={d.channel || ''} onChange={v => setD({ ...d, channel: v })} placeholder="官网/App Store/支付宝" />
      <ImageField label="充值截图" value={d.image} onChange={v => setD({ ...d, image: v })} />
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

function WardrobeEditor({ open, onOpenChange, gameId, wardrobe }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string; wardrobe: Wardrobe | null;
}) {
  const [d, setD] = useState<Partial<Wardrobe>>({});
  useEffect(() => {
    if (open) setD(wardrobe ? { ...wardrobe } : { name: '', kind: '皮肤', rarity: 'SSR', owned: true, images: [], note: '' });
  }, [open, wardrobe]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写名称'); return; }
    const now = Date.now();
    if (wardrobe) await db.wardrobe.update(wardrobe.id, { ...d, updatedAt: now });
    else await db.wardrobe.add({ id: uid(), gameId, createdAt: now, updatedAt: now, deletedAt: null,
      name: d.name!, kind: d.kind || '皮肤', rarity: d.rarity || '', owned: !!d.owned, images: d.images || [], note: d.note || '' });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={wardrobe ? '编辑衣柜' : '加衣柜'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="名称" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <TextInput label="类型" value={d.kind || ''} onChange={v => setD({ ...d, kind: v })} placeholder="皮肤/时装/装备/家具" />
      <SelectField label="稀有度" value={d.rarity || 'SSR'} onChange={v => setD({ ...d, rarity: v })} options={RARITY_OPTIONS} />
      <MultiImageField label="图片（可多张）" value={d.images || []} onChange={v => setD({ ...d, images: v })} max={9} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.owned} onChange={e => setD({ ...d, owned: e.target.checked })} /> 已拥有</label>
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

function AccountEditor({ open, onOpenChange, gameId, account }: {
  open: boolean; onOpenChange: (v: boolean) => void; gameId: string; account: GameAccount | null;
}) {
  const [d, setD] = useState<Partial<GameAccount>>({});
  useEffect(() => {
    if (open) setD(account ? { ...account } : { name: '', server: '', uid: '', role: '', note: '' });
  }, [open, account]);
  const save = async () => {
    if (!d.name?.trim()) { toast.error('请填写账号名'); return; }
    const now = Date.now();
    if (account) await db.accounts.update(account.id, { ...d, updatedAt: now });
    else await db.accounts.add({ id: uid(), gameId, createdAt: now, updatedAt: now, deletedAt: null,
      name: d.name!, server: d.server || '', uid: d.uid || '', role: d.role || '', note: d.note || '' });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title={account ? '编辑账号' : '添加账号'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="账号名/备注" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="区服" value={d.server || ''} onChange={v => setD({ ...d, server: v })} />
        <TextInput label="UID" value={d.uid || ''} onChange={v => setD({ ...d, uid: v })} />
      </div>
      <TextInput label="角色名" value={d.role || ''} onChange={v => setD({ ...d, role: v })} />
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}
