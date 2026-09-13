import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, ShoppingCart, Coins, Box, BarChart3 } from 'lucide-react';
import { db, uid, softDelete } from '@/lib/db';
import { Merch, Order, Sale, Storage } from '@/lib/types';
import { MERCH_STATUS, ORDER_STATUS, SALE_TYPE, fmtMoney, fmtDate, countdownText, daysUntil } from '@/lib/format';
import { monthlyTrend } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader, Empty, Pill, StatCard } from '@/components/common';
import { EditorModal, Field, TextInput, SelectField, DateInput, NumInput, AreaInput, LinkField } from '@/components/form';
import { toast } from 'sonner';

export default function MerchDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const merch = useLiveQuery(() => db.merch.get(id), [id]);
  const orders = useLiveQuery(() => db.orders.filter(o => !o.deletedAt).toArray(), [], []) || [];
  const sales = useLiveQuery(() => db.sales.where('merchId').equals(id).filter(s => !s.deletedAt).toArray(), [id]) || [];
  const storage = useLiveQuery(() => db.storage.where('merchId').equals(id).filter(s => !s.deletedAt).toArray(), [id]) || [];
  const allMerch = useLiveQuery(() => db.merch.filter(m => !m.deletedAt).toArray(), [], []) || [];

  const [oOpen, setOOpen] = useState(false);
  const [sOpen, setSOpen] = useState(false);
  const [stOpen, setStOpen] = useState(false);
  const [editS, setEditS] = useState<Sale | null>(null);

  useEffect(() => {
    const add = params.get('add');
    if (add === 'order') { setOOpen(true); setParams({}, { replace: true }); }
    if (add === 'sale') { setEditS(null); setSOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  if (!merch) return <Empty icon="⏳" text="加载中…" />;

  const myOrders = orders.filter(o => (o.orderNo && o.orderNo === merch.orderNo) || o.ip === merch.ip);
  const income = sales.reduce((s, x) => s + (x.net || 0), 0);
  const net = (merch.totalPrice || 0) - income;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2">{merch.coverImg ? <img src={merch.coverImg} className="size-6 rounded object-cover" alt="" /> : <span className="text-xl">{merch.cover}</span>}{merch.name}</span>}
        onBack={() => navigate('/merch')}
        subtitle={`${merch.ip} · ${MERCH_STATUS[merch.status]}`}
        right={<Button variant="ghost" size="icon-sm" onClick={() => navigate(`/merch?edit=${merch.id}`)}><Pencil className="size-4" /></Button>}
      />
      <div className="grid grid-cols-3 gap-2 px-4 pt-3">
        <StatCard label="数量" value={merch.qty} />
        <StatCard label="入手价" value={fmtMoney(merch.totalPrice)} />
        <StatCard label="回血" value={fmtMoney(income)} accent="text-emerald-500" />
      </div>
      {merch.location && (
        <div className="mx-4 mt-2 rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">收纳位置</p>
          <p className="font-medium">{merch.location}</p>
        </div>
      )}

      <Tabs defaultValue="overview" className="px-3 pt-3">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="buy">购买</TabsTrigger>
          <TabsTrigger value="sale">出物</TabsTrigger>
          <TabsTrigger value="storage">收纳</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="入手总价" value={fmtMoney(merch.totalPrice)} />
            <StatCard label="回血净额" value={fmtMoney(net)} />
            <StatCard label="关联订单" value={myOrders.length} />
            <StatCard label="出物次数" value={sales.length} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setOOpen(true)}><ShoppingCart className="size-4" /> 记购买</Button>
            <Button className="flex-1" variant="secondary" onClick={() => { setEditS(null); setSOpen(true); }}><Coins className="size-4" /> 记出物</Button>
          </div>
        </TabsContent>

        <TabsContent value="buy" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => setOOpen(true)}><Plus className="size-4" /> 加订单</Button></div>
          {myOrders.length === 0 ? <Empty icon="🛒" text="还没有订单" /> : myOrders.map(o => (
            <div key={o.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.name}</span>
                <Pill color={o.status === 'arrived' ? '#22c55e' : o.status === 'deposit' ? '#f59e0b' : '#94a3b8'}>{ORDER_STATUS[o.status]}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{o.platform} · {fmtMoney(o.total)} · {fmtDate(o.orderDate)}</p>
              {o.balance > 0 && o.status === 'deposit' && <p className="mt-1 text-xs text-amber-500">待补款 {fmtMoney(o.balance)} · {countdownText(o.depositDate)}</p>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sale" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditS(null); setSOpen(true); }}><Plus className="size-4" /> 记出物</Button></div>
          {sales.length === 0 ? <Empty icon="💱" text="还没有出物记录" /> : sales.map(s => (
            <div key={s.id} onClick={() => { setEditS(s); setSOpen(true); }} className="rounded-xl border bg-card p-3 active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <span className="font-medium">{SALE_TYPE[s.type]}</span>
                <span className="text-xs text-emerald-500">净回血 {fmtMoney(s.net)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.platform} · {s.buyer} · {fmtDate(s.date)}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="storage" className="flex flex-col gap-2">
          <div className="flex justify-end"><Button size="sm" onClick={() => setStOpen(true)}><Plus className="size-4" /> 记收纳</Button></div>
          {storage.length === 0 ? <Empty icon="📦" text="还没记录收纳位置" /> : storage.map(s => (
            <div key={s.id} className="rounded-xl border bg-card p-3">
              <p className="font-medium">{s.location}{s.box ? ' · ' + s.box : ''}{s.layer ? ' · ' + s.layer : ''}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {s.display && <Pill color="#7c5cff">展示</Pill>}
                {s.moisture && <Pill>防潮</Pill>}
                {s.lightproof && <Pill>避光</Pill>}
                {s.lent && <Pill color="#f59e0b">外借</Pill>}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="stats" className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="该周边净花费" value={fmtMoney(net)} />
            <StatCard label="回血率" value={merch.totalPrice ? `${((income / merch.totalPrice) * 100).toFixed(0)}%` : '—'} />
          </div>
          <BarChart title="月度周边花费" data={monthlyTrend(allMerch, m => m.totalPrice, 6).filter(d => d.value >= 0)} color="#f59e0b" />
        </TabsContent>
      </Tabs>
      <div className="h-4" />

      <OrderEditor open={oOpen} onOpenChange={setOOpen} merch={merch} />
      <SaleEditor open={sOpen} onOpenChange={setSOpen} merchId={id} sale={editS} />
      <StorageEditor open={stOpen} onOpenChange={setStOpen} merchId={id} />
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
              <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 80}px`, background: color }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderEditor({ open, onOpenChange, merch }: any) {
  const [d, setD] = useState<any>({});
  const [ocrBusy, setOcrBusy] = useState(false);
  useEffect(() => { if (open) setD({ name: merch?.name || '', ip: merch?.ip || '', orderDate: new Date().toISOString().slice(0, 10), platform: merch?.platform || '', shop: merch?.shop || '', orderNo: '', originPrice: merch?.totalPrice || 0, shipping: 0, tax: 0, discount: 0, total: merch?.totalPrice || 0, currency: 'CNY', payMethod: '', status: 'paid', logistics: '', trackingNo: '', depositDate: '', balance: 0, arrivalDate: '', note: '', link: '' }); }, [open, merch]);
  const runOcr = async () => {
    setOcrBusy(true);
    try {
      const { ocrImage, extractAmount } = await import('@/lib/ocr');
      const url = await new Promise<string>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = () => { const f = input.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(f); };
        input.click();
      });
      const text = await ocrImage(url, () => {});
      const amt = extractAmount(text);
      if (amt) setD({ ...d, originPrice: amt, total: amt });
      toast.success(amt ? `识别到金额 ¥${amt}，请核对` : '未识别到金额');
    } catch { toast.error('识别失败'); }
    finally { setOcrBusy(false); }
  };
  const save = async () => {
    const now = Date.now();
    const total = (d.originPrice || 0) + (d.shipping || 0) + (d.tax || 0) - (d.discount || 0);
    await db.orders.add({ id: uid(), createdAt: now, updatedAt: now, deletedAt: null, ...d, total });
    if (merch) await db.merch.update(merch.id, { orderNo: d.orderNo, acquireDate: d.arrivalDate || merch.acquireDate, updatedAt: now });
    toast.success('已保存'); onOpenChange(false);
  };
  return (
    <EditorModal title="记购买/订单" open={open} onOpenChange={onOpenChange} onSave={save}>
      <div className="rounded-lg border bg-muted/30 p-2">
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={runOcr} disabled={ocrBusy}>
          {ocrBusy ? '识别中…' : '📷 从订单截图识别金额'}
        </Button>
      </div>
      <LinkField label="订单链接（自动带出平台）" value={d.link || ''} onChange={v => setD({ ...d, link: v })} onResolved={r => setD({ ...d, platform: r.platform, name: d.name || r.title })} />
      <TextInput label="订单名称" value={d.name || ''} onChange={v => setD({ ...d, name: v })} />
      <TextInput label="IP" value={d.ip || ''} onChange={v => setD({ ...d, ip: v })} />
      <div className="grid grid-cols-2 gap-3">
        <DateInput label="下单日期" value={d.orderDate || ''} onChange={v => setD({ ...d, orderDate: v })} />
        <TextInput label="平台/店铺" value={d.platform || ''} onChange={v => setD({ ...d, platform: v })} />
      </div>
      <TextInput label="订单号" value={d.orderNo || ''} onChange={v => setD({ ...d, orderNo: v })} />
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="原价" value={d.originPrice ?? 0} onChange={v => setD({ ...d, originPrice: v })} />
        <NumInput label="运费" value={d.shipping ?? 0} onChange={v => setD({ ...d, shipping: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="优惠" value={d.discount ?? 0} onChange={v => setD({ ...d, discount: v })} />
        <NumInput label="关税/手续费" value={d.tax ?? 0} onChange={v => setD({ ...d, tax: v })} />
      </div>
      <SelectField label="状态" value={d.status || 'paid'} onChange={v => setD({ ...d, status: v })} options={Object.entries(ORDER_STATUS).map(([value, label]) => ({ value, label }))} />
      {d.status === 'deposit' && (
        <div className="grid grid-cols-2 gap-3">
          <DateInput label="补款日期" value={d.depositDate || ''} onChange={v => setD({ ...d, depositDate: v })} />
          <NumInput label="尾款金额" value={d.balance ?? 0} onChange={v => setD({ ...d, balance: v })} />
        </div>
      )}
      <DateInput label="到货日期" value={d.arrivalDate || ''} onChange={v => setD({ ...d, arrivalDate: v })} />
    </EditorModal>
  );
}

function SaleEditor({ open, onOpenChange, merchId, sale }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD(sale ? { ...sale } : { type: 'sale', date: new Date().toISOString().slice(0, 10), platform: '', buyer: '', price: 0, shipping: 0, fee: 0, net: 0, status: 'done', reason: '', note: '' }); }, [open, sale]);
  const net = (d.price || 0) - (d.shipping || 0) - (d.fee || 0);
  const save = async () => {
    const now = Date.now();
    const payload = { ...d, net };
    if (sale) await db.sales.update(sale.id, { ...payload, updatedAt: now });
    else await db.sales.add({ id: uid(), merchId, createdAt: now, updatedAt: now, deletedAt: null, ...payload });
    if (!sale) await db.merch.update(merchId, { status: 'sold', updatedAt: now });
    toast.success('已记录'); onOpenChange(false);
  };
  return (
    <EditorModal title={sale ? '编辑出物' : '记出物'} open={open} onOpenChange={onOpenChange} onSave={save}>
      <SelectField label="类型" value={d.type || 'sale'} onChange={v => setD({ ...d, type: v })} options={Object.entries(SALE_TYPE).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-2 gap-3">
        <DateInput label="日期" value={d.date || ''} onChange={v => setD({ ...d, date: v })} />
        <TextInput label="平台/买家" value={d.buyer || ''} onChange={v => setD({ ...d, buyer: v })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="出物价" value={d.price ?? 0} onChange={v => setD({ ...d, price: v })} />
        <NumInput label="邮费" value={d.shipping ?? 0} onChange={v => setD({ ...d, shipping: v })} />
        <NumInput label="手续费" value={d.fee ?? 0} onChange={v => setD({ ...d, fee: v })} />
      </div>
      <div className="rounded-lg bg-muted p-2 text-sm">净回血：{fmtMoney(net)}</div>
      <AreaInput label="备注" value={d.note || ''} onChange={v => setD({ ...d, note: v })} />
    </EditorModal>
  );
}

function StorageEditor({ open, onOpenChange, merchId }: any) {
  const [d, setD] = useState<any>({});
  useEffect(() => { if (open) setD({ location: '', box: '', layer: '', display: false, moisture: false, lightproof: false, lent: false, lentTo: '', lentDate: '', returnDate: '', note: '' }); }, [open]);
  const save = async () => {
    const now = Date.now();
    await db.storage.add({ id: uid(), merchId, createdAt: now, updatedAt: now, deletedAt: null, ...d });
    if (d.location) await db.merch.update(merchId, { location: d.location, updatedAt: now });
    toast.success('已记录'); onOpenChange(false);
  };
  return (
    <EditorModal title="记收纳" open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="位置" value={d.location || ''} onChange={v => setD({ ...d, location: v })} placeholder="如：展示柜A" />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="盒" value={d.box || ''} onChange={v => setD({ ...d, box: v })} />
        <TextInput label="层/格" value={d.layer || ''} onChange={v => setD({ ...d, layer: v })} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.display} onChange={e => setD({ ...d, display: e.target.checked })} /> 展示</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.moisture} onChange={e => setD({ ...d, moisture: e.target.checked })} /> 防潮</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.lightproof} onChange={e => setD({ ...d, lightproof: e.target.checked })} /> 避光</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.lent} onChange={e => setD({ ...d, lent: e.target.checked })} /> 外借</label>
      </div>
    </EditorModal>
  );
}
