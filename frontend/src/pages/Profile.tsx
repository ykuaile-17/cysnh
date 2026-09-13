import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, hardDelete, restore, uid } from '@/lib/db';
import { rollbackTo } from '@/lib/history';
import { useApp } from '@/lib/app-store';
import { PageHeader, Empty, StatCard, Pill } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditorModal, TextInput, SelectField } from '@/components/form';
import { Sun, Moon, Lock, Download, Upload, Trash2, RotateCcw, Palette, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const TABLES: [string, any, string][] = [
  ['games', 'gameId' as any, '游戏'], ['gameStories', 'gameId', '剧情'], ['gachaRecords', 'gameId', '抽卡'],
  ['stars', null, '追星'], ['materials', 'starId', '物料'], ['schedules', 'starId', '行程'],
  ['novels', null, '小说'], ['readingLogs', 'novelId', '阅读'], ['notes', 'novelId', '笔记'],
  ['excerpts', 'novelId', '摘抄'], ['merch', null, '周边'], ['orders', null, '订单'], ['sales', 'merchId', '出物'],
];

export default function Profile() {
  const { profile, ui, modules, pin, updateProfile, updateUI, updateModules, updatePin } = useApp();
  const [pinOpen, setPinOpen] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const history = useLiveQuery(async () => {
    const rows = await db.history.orderBy('createdAt').reverse().limit(60).toArray();
    return rows;
  }, [], []);

  const trash = useLiveQuery(async () => {
    const res: { table: string; label: string; id: string; name: string }[] = [];
    for (const [tbl, , label] of TABLES) {
      const rows: any[] = await (db as any)[tbl].filter((r: any) => r.deletedAt).toArray();
      rows.forEach((r: any) => res.push({ table: tbl, label, id: r.id, name: r.name || r.title || r.content?.slice(0, 12) || '(未命名)' }));
    }
    return res;
  }, [], []);

  const total = useLiveQuery(async () => {
    const [games, stars, novels, merch, materials, schedules, gacha, sales] = await Promise.all([
      db.games.filter(g => !g.deletedAt).count(), db.stars.filter(s => !s.deletedAt).count(),
      db.novels.filter(n => !n.deletedAt).count(), db.merch.filter(m => !m.deletedAt).count(),
      db.materials.filter(m => !m.deletedAt).count(), db.schedules.filter(s => !s.deletedAt).toArray(),
      db.gachaRecords.filter(r => !r.deletedAt).count(), db.sales.filter(s => !s.deletedAt).toArray(),
    ]);
    const spend = (await db.merch.filter(m => !m.deletedAt).toArray()).reduce((s, m) => s + (m.totalPrice || 0), 0);
    return { games, stars, novels, merch, materials, schedules: schedules.length, gacha, sales: sales.length, spend };
  }, [], undefined);

  const exportData = async () => {
    const dump: any = {};
    for (const [tbl] of TABLES) dump[tbl] = await (db as any)[tbl].toArray();
    dump.settings = await db.settings.toArray();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `次元收纳盒备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('已导出备份');
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const dump = JSON.parse(text);
      for (const [tbl] of TABLES) {
        if (Array.isArray(dump[tbl])) await (db as any)[tbl].bulkPut(dump[tbl]);
      }
      if (Array.isArray(dump.settings)) await db.settings.bulkPut(dump.settings);
      toast.success('已导入数据');
    } catch (e) { toast.error('导入失败：文件格式不正确'); }
  };

  const clearAll = async () => {
    if (!confirm('确定清空所有数据？此操作不可恢复！')) return;
    for (const [tbl] of TABLES) await (db as any)[tbl].clear();
    toast.success('已清空');
  };

  const savePin = async (code: string) => {
    if (code.length < 4) { toast.error('密码至少4位'); return; }
    await updatePin({ enabled: true, code });
    toast.success('隐私锁已开启');
    setPinOpen(false);
  };

  return (
    <div>
      <PageHeader title="我的" />

      {/* 个人资料 */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="text-4xl">{profile?.avatar || '🌟'}</span>
        <div className="flex-1">
          <p className="text-lg font-bold">{profile?.nickname || '谷主'}</p>
          <p className="text-xs text-muted-foreground">{profile?.signature || '把每一份热爱都收进谷里'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const nn = prompt('昵称', profile?.nickname || ''); const av = prompt('头像emoji', profile?.avatar || '🌟');
          if (nn !== null) updateProfile({ nickname: nn, avatar: av || profile?.avatar });
        }}>编辑</Button>
      </div>

      {/* 数据总览 */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-3">
        <StatCard label="总花费" value={fmtMoneyShort(total?.spend || 0)} accent="text-destructive" />
        <StatCard label="总记录" value={fmtNum((total?.games || 0) + (total?.stars || 0) + (total?.novels || 0) + (total?.merch || 0))} />
        <StatCard label="总抽卡" value={`${fmtNum(total?.gacha || 0)}`} />
      </div>

      {/* 模块管理 */}
      <Section icon={<Palette className="size-4" />} title="模块管理">
        {[{ k: 'games', l: '游戏' }, { k: 'stars', l: '追星' }, { k: 'novels', l: '小说' }, { k: 'merch', l: '周边' }].map(m => (
          <Row key={m.k}>
            <span>{m.l}</span>
            <button onClick={() => updateModules({ [m.k]: !(modules as any)[m.k] })}
              className={`relative h-6 w-11 rounded-full transition-colors ${(modules as any)[m.k] ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${(modules as any)[m.k] ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </Row>
        ))}
      </Section>

      {/* 外观 */}
      <Section icon={<Sun className="size-4" />} title="外观">
        <Row>
          <span>主题</span>
          <SelectField label="" value={ui.theme} onChange={v => updateUI({ theme: v as any })}
            options={[{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'system', label: '跟随系统' }]} />
        </Row>
        <Row>
          <span className="flex items-center gap-1.5"><EyeOff className="size-4" /> 隐藏金额</span>
          <Toggle on={ui.hideAmount} onToggle={() => updateUI({ hideAmount: !ui.hideAmount })} />
        </Row>
      </Section>

      {/* 隐私与安全 */}
      <Section icon={<Lock className="size-4" />} title="隐私与安全">
        <Row>
          <span>隐私锁{pin.enabled ? '（已开启）' : ''}</span>
          <Button size="sm" variant="outline" onClick={() => setPinOpen(true)}>{pin.enabled ? '修改' : '开启'}</Button>
        </Row>
      </Section>

      {/* 数据管理 */}
      <Section icon={<Download className="size-4" />} title="数据管理">
        <div className="flex gap-2 px-4 py-1">
          <Button variant="outline" className="flex-1" onClick={exportData}><Download className="size-4" /> 导出</Button>
          <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> 导入</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e => { if (e.target.files?.[0]) importData(e.target.files[0]); e.target.value = ''; }} />
        </div>
        <Row>
          <span className="flex items-center gap-1.5"><Trash2 className="size-4" /> 回收站{(trash?.length || 0) > 0 ? `（${(trash?.length)})` : ''}</span>
          <Button size="sm" variant="outline" onClick={() => setBinOpen(true)}>查看</Button>
        </Row>
        <Row>
          <span className="text-destructive">清空所有数据</span>
          <Button size="sm" variant="destructive" onClick={clearAll}>清空</Button>
        </Row>
      </Section>

      {/* 版本历史 */}
      <Section icon={<RotateCcw className="size-4" />} title="版本历史">
        <Row>
          <span className="flex items-center gap-1.5">修改记录{(history?.length || 0) > 0 ? `（${(history?.length)})` : ''}</span>
          <Button size="sm" variant="outline" onClick={() => setHistOpen(true)}>查看</Button>
        </Row>
      </Section>

      <div className="h-6" />

      <PinModal open={pinOpen} onOpenChange={setPinOpen} onSave={savePin} />
      <BinModal open={binOpen} onOpenChange={setBinOpen} trash={trash || []} />
      <HistoryModal open={histOpen} onOpenChange={setHistOpen} items={history || []} />
    </div>
  );
}

function fmtMoneyShort(n: number) {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}w` : n >= 1000 ? `¥${(n / 1000).toFixed(1)}k` : `¥${n}`;
}
function fmtNum(n: number) { return n.toLocaleString('zh-CN'); }

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 px-4 pb-1 text-sm font-semibold text-foreground/80">
        {icon}{title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm">{children}</div>;
}
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function PinModal({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <EditorModal title="设置隐私锁" open={open} onOpenChange={onOpenChange} onSave={() => onSave(code)}>
      <p className="text-sm text-muted-foreground">设置一个 4-6 位数字密码，开启后每次进入需输入。</p>
      <Input type="password" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="输入密码" className="text-center text-2xl tracking-[0.5em]" />
    </EditorModal>
  );
}

function BinModal({ open, onOpenChange, trash }: { open: boolean; onOpenChange: (v: boolean) => void; trash: { table: string; label: string; id: string; name: string }[] }) {
  return (
    <EditorModal title={`回收站（${trash.length}）`} open={open} onOpenChange={onOpenChange} onSave={() => onOpenChange(false)} saveText="关闭">
      {trash.length === 0 ? <Empty icon="🗑️" text="回收站是空的" /> : (
        <div className="flex flex-col gap-2">
          {trash.map(t => (
            <div key={t.table + t.id} className="flex items-center gap-2 rounded-xl border bg-card p-2">
              <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{t.label}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{t.name}</span>
              <Button size="sm" variant="ghost" onClick={() => { restore((db as any)[t.table], t.id); toast('已恢复'); }}><RotateCcw className="size-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { hardDelete((db as any)[t.table], t.id); toast('已彻底删除'); }}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </EditorModal>
  );
}

const TBL_LABEL: Record<string, string> = Object.fromEntries(TABLES.map(([t, , l]) => [t, l]));
const ACT_LABEL: Record<string, string> = { create: '新建', update: '修改', delete: '删除' };
function fmtHistDate(ts: number) {
  try { return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function HistoryModal({ open, onOpenChange, items }: any) {
  const [busy, setBusy] = useState<string | null>(null);
  const rollback = async (e: any) => {
    setBusy(e.id);
    try { await rollbackTo(e); toast.success('已回滚到该版本'); }
    catch { toast.error('回滚失败'); }
    finally { setBusy(null); }
  };
  return (
    <EditorModal title={`版本历史（${items.length}）`} open={open} onOpenChange={onOpenChange} onSave={() => onOpenChange(false)} saveText="关闭">
      {items.length === 0 ? <Empty icon="🕓" text="暂无修改记录" /> : (
        <div className="flex flex-col gap-2">
          {items.map((e: any) => (
            <div key={e.id} className="rounded-xl border bg-card p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                <Pill color={e.action === 'create' ? '#22c55e' : e.action === 'delete' ? '#ef4444' : '#7c5cff'}>{ACT_LABEL[e.action] || e.action}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{TBL_LABEL[e.table] || e.table} · {fmtHistDate(e.createdAt)}</p>
              {e.action !== 'create' && (
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => rollback(e)} disabled={busy === e.id}>回滚到此版本</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </EditorModal>
  );
}
