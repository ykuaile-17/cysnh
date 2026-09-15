import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload } from 'lucide-react';
import { db, uid } from '@/lib/db';
import { PageHeader, Empty, Pill } from '@/components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { parseCSV, toCSV, downloadCSV, toBool, toNum } from '@/lib/csv';
import { toast } from 'sonner';

const MERCH_STATUS_MAP: Record<string, string> = { '拥有': 'own', '重复': 'dup', '心愿': 'wish', '已出': 'sold', '外借': 'lent', '丢失': 'lost', '损坏': 'damaged' };
const MATERIAL_STATUS_MAP: Record<string, string> = { '想看': 'want', '在看': 'watching', '看完': 'watched', '跳过': 'skip' };
const MERCH_CAT_MAP: Record<string, string> = { '游戏周边': 'game', '追星周边': 'star', '其他': 'other' };

type Row = string[];
const col = (row: Row, header: Row, name: string) => {
  const i = header.indexOf(name);
  return i >= 0 ? (row[i] || '').trim() : '';
};

export default function DataImport() {
  const navigate = useNavigate();
  const games = useLiveQuery(() => db.games.filter(g => !g.deletedAt).toArray(), [], []) || [];
  const stars = useLiveQuery(() => db.stars.filter(s => !s.deletedAt).toArray(), [], []) || [];
  const gameMap = Object.fromEntries(games.map(g => [g.name, g.id]));
  const starMap = Object.fromEntries(stars.map(s => [s.name, s.id]));
  const [tab, setTab] = useState('card');

  return (
    <div>
      <PageHeader title="数据导入" onBack={() => navigate('/profile')} subtitle="从 Excel 导出的 CSV 批量导入" />
      <Tabs value={tab} onValueChange={setTab} className="px-3 pt-2">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="card">卡面图鉴</TabsTrigger>
          <TabsTrigger value="gacha">抽卡记录</TabsTrigger>
          <TabsTrigger value="merch">周边</TabsTrigger>
          <TabsTrigger value="material">追星物料</TabsTrigger>
          <TabsTrigger value="pc">小卡</TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="pt-2">
          <ImportPanel
            columns={['游戏', '卡面名称', '角色', '稀有度', '是否拥有', '觉醒/突破', '联动剧情', '所属账号', '获取方式', '获得日期', '备注']}
            sample={['原神', '星之少女', '莉莉', 'SSR', '是', '2', '序章剧情', '主号', '限定卡池', '2025-01-01', '满破']}
            onImport={async (header, rows) => {
              let added = 0, skipped = 0;
              for (const r of rows) {
                const gname = col(r, header, '游戏'); const gid = gameMap[gname];
                if (!gid) { skipped++; continue; }
                const name = col(r, header, '卡面名称'); if (!name) { skipped++; continue; }
                const storyTitle = col(r, header, '联动剧情');
                const story = storyTitle ? (await db.gameStories.where('gameId').equals(gid).filter(s => s.title === storyTitle && !s.deletedAt).first()) : undefined;
                const accName = col(r, header, '所属账号');
                const acc = accName ? (await db.accounts.where('gameId').equals(gid).filter(a => a.name === accName && !a.deletedAt).first()) : undefined;
                const now = Date.now();
                await db.cards.add({ id: uid(), gameId: gid, createdAt: now, updatedAt: now, deletedAt: null,
                  name, character: col(r, header, '角色'), rarity: col(r, header, '稀有度') || 'SSR', owned: toBool(col(r, header, '是否拥有') || '是'),
                  obtainWay: col(r, header, '获取方式'), obtainDate: col(r, header, '获得日期'),
                  images: [], coverImg: undefined, storyId: story?.id ?? null, accountId: acc?.id ?? null, accountNote: '',
                  awaken: toNum(col(r, header, '觉醒/突破')) });
                added++;
              }
              return { added, skipped };
            }}
          />
        </TabsContent>

        <TabsContent value="gacha" className="pt-2">
          <ImportPanel
            columns={['游戏', '日期', '卡池', '抽数', '消耗资源', '消耗数量', '备注']}
            sample={['原神', '2025-01-01', '限定UP·星之少女', '10', '原石', '1600', '歪了']}
            onImport={async (header, rows) => {
              let added = 0, skipped = 0;
              const poolCache: Record<string, string> = {};
              for (const r of rows) {
                const gname = col(r, header, '游戏'); const gid = gameMap[gname];
                if (!gid) { skipped++; continue; }
                const poolName = col(r, header, '卡池') || '默认卡池';
                let pid = poolCache[poolName];
                if (!pid) {
                  const ex = await db.gachaPools.where('gameId').equals(gid).filter(p => p.name === poolName && !p.deletedAt).first();
                  if (ex) pid = ex.id;
                  else { pid = uid(); const now = Date.now(); await db.gachaPools.add({ id: pid, gameId: gid, name: poolName, type: 'other', startDate: '', endDate: '', createdAt: now, updatedAt: now, deletedAt: null }); }
                  poolCache[poolName] = pid;
                }
                const now = Date.now();
                await db.gachaRecords.add({ id: uid(), gameId: gid, poolId: pid, datetime: col(r, header, '日期') || new Date().toISOString().slice(0, 10),
                  pulls: toNum(col(r, header, '抽数')) || 1, costType: col(r, header, '消耗资源'), costAmount: toNum(col(r, header, '消耗数量')), note: col(r, header, '备注'), images: [], createdAt: now, updatedAt: now, deletedAt: null });
                added++;
              }
              return { added, skipped };
            }}
          />
        </TabsContent>

        <TabsContent value="merch" className="pt-2">
          <ImportPanel
            columns={['名称', '分类', 'IP', '角色', '类型', '数量', '单价', '总价', '入手日期', '状态', '备注']}
            sample={['景品手办', '游戏周边', '原神', '莉莉', '手办', '1', '120', '120', '2025-02-01', '拥有', '盒损']}
            onImport={async (header, rows) => {
              let added = 0, skipped = 0;
              for (const r of rows) {
                const name = col(r, header, '名称'); if (!name) { skipped++; continue; }
                const now = Date.now();
                const status = MERCH_STATUS_MAP[col(r, header, '状态')] || 'own';
                const cat = MERCH_CAT_MAP[col(r, header, '分类')] || 'other';
                await db.merch.add({ id: uid(), createdAt: now, updatedAt: now, deletedAt: null,
                  name, cover: '🧸', coverImg: undefined, images: [],
                  category: cat as any, ip: col(r, header, 'IP'), character: col(r, header, '角色'), type: col(r, header, '类型'),
                  pattern: '', version: '', official: 'official', condition: '全新', qty: toNum(col(r, header, '数量')) || 1,
                  unitPrice: toNum(col(r, header, '单价')), totalPrice: toNum(col(r, header, '总价')), acquireDate: col(r, header, '入手日期'),
                  platform: '', shop: '', orderNo: '', logistics: '', status: status as any, location: '', tags: [], note: col(r, header, '备注') });
                added++;
              }
              return { added, skipped };
            }}
          />
        </TabsContent>

        <TabsContent value="material" className="pt-2">
          <ImportPanel
            columns={['明星', '类型', '标题', '专辑', '期数', '日期', '平台', '状态', '时长', '感想', '备注']}
            sample={['某偶像', 'mv', '主打歌MV', '一专', '1', '2025-03-01', 'B站', '看完', '4', '好听', '循环']}
            onImport={async (header, rows) => {
              let added = 0, skipped = 0;
              for (const r of rows) {
                const sname = col(r, header, '明星'); const sid = starMap[sname];
                if (!sid) { skipped++; continue; }
                const title = col(r, header, '标题'); if (!title) { skipped++; continue; }
                const now = Date.now();
                const status = MATERIAL_STATUS_MAP[col(r, header, '状态')] || 'want';
                await db.materials.add({ id: uid(), starId: sid, createdAt: now, updatedAt: now, deletedAt: null,
                  type: (col(r, header, '类型') || 'mv') as any, title, album: col(r, header, '专辑'), episode: col(r, header, '期数'),
                  date: col(r, header, '日期'), platform: col(r, header, '平台'), url: '', duration: toNum(col(r, header, '时长')), status: status as any,
                  progress: '', rating: 0, feeling: col(r, header, '感想'), highlight: '', member: '', tags: [], note: col(r, header, '备注'), images: [] });
                added++;
              }
              return { added, skipped };
            }}
          />
        </TabsContent>

        <TabsContent value="pc" className="pt-2">
          <ImportPanel
            columns={['明星', '专辑', '卡名', '类型', '稀有度', '总拥有', '不同款', '重复', '备注']}
            sample={['某偶像', '一专', '签名小卡', 'album', '', '1', '1', '0', '']}
            onImport={async (header, rows) => {
              let added = 0, skipped = 0;
              for (const r of rows) {
                const sname = col(r, header, '明星'); const sid = starMap[sname];
                if (!sid) { skipped++; continue; }
                const name = col(r, header, '卡名'); if (!name) { skipped++; continue; }
                const now = Date.now();
                await db.photocards.add({ id: uid(), starId: sid, createdAt: now, updatedAt: now, deletedAt: null,
                  album: col(r, header, '专辑'), name, kind: (col(r, header, '类型') || 'album') as any, rarity: col(r, header, '稀有度'),
                  total: toNum(col(r, header, '总拥有')) || 1, owned: toNum(col(r, header, '不同款')) || 1, dup: toNum(col(r, header, '重复')), photo: undefined, note: col(r, header, '备注') });
                added++;
              }
              return { added, skipped };
            }}
          />
        </TabsContent>
      </Tabs>
      <div className="h-4" />
    </div>
  );
}

function ImportPanel({ columns, sample, onImport }: {
  columns: string[]; sample: string[];
  onImport: (header: Row, rows: Row[]) => Promise<{ added: number; skipped: number }>;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const parse = (raw: string): Row[] => parseCSV(raw);
  const doPreview = () => {
    const rows = parse(text);
    if (rows.length < 2) { toast.error('至少要有表头 + 一行数据'); return; }
    setPreview(rows.slice(0, 6));
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setText(reader.result as string); setPreview(null); };
    reader.readAsText(f, 'utf-8');
  };
  const runImport = async () => {
    const rows = parse(text);
    if (rows.length < 2) { toast.error('没有可导入的数据'); return; }
    setBusy(true);
    try {
      const [header, ...data] = rows;
      const res = await onImport(header, data);
      toast.success(`导入完成：新增 ${res.added} 条${res.skipped ? `，跳过 ${res.skipped} 条（游戏/明星未匹配）` : ''}`);
      setText(''); setPreview(null);
    } catch (err) {
      toast.error('导入失败，请检查格式');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border bg-card p-3">
        <p className="text-sm font-medium">第 1 步：下载模板</p>
        <p className="mt-1 text-xs text-muted-foreground">用 Excel 打开填空后，另存为 CSV（UTF-8）再导入。图片请在 App 内补充。</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => downloadCSV(`模板_${columns[1] || '数据'}.csv`, [columns, sample])}>
          <Download className="size-4" /> 下载 CSV 模板
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <p className="text-sm font-medium">第 2 步：上传或粘贴 CSV</p>
        <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm active:scale-95">
          <Upload className="size-4" /> 选择 CSV 文件
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
        <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="也可直接把 CSV 内容粘贴到这里（含表头）" rows={5} className="mt-2" />
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" size="sm" onClick={doPreview} disabled={!text.trim()}>预览前几行</Button>
          <Button size="sm" onClick={runImport} disabled={!text.trim() || busy}>{busy ? '导入中…' : '开始导入'}</Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        列顺序（表头需一致）：{columns.join(' / ')}
      </div>

      {preview && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full text-[11px]">
            <thead><tr className="bg-muted/50">{preview[0].map((c, i) => <th key={i} className="whitespace-nowrap border-b px-2 py-1 text-left font-medium">{c}</th>)}</tr></thead>
            <tbody>
              {preview.slice(1).map((r, ri) => (
                <tr key={ri}>{r.map((c, i) => <td key={i} className="whitespace-nowrap border-b px-2 py-1">{c || '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="px-2 py-1 text-[11px] text-muted-foreground">仅预览前 {preview.length - 1} 行</p>
        </div>
      )}
    </div>
  );
}
