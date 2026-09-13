import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Check, Bell } from 'lucide-react';
import { db, uid } from '@/lib/db';
import { Reminder, ReminderModule, ReminderType } from '@/lib/types';
import { REMINDER_TYPE_LABEL, fmtDateTime, countdownText, daysUntil } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader, Empty, Pill } from '@/components/common';
import { EditorModal, TextInput, SelectField, DateInput, AreaInput } from '@/components/form';
import { toast } from 'sonner';

const MODULE_OPTS: { value: ReminderModule; label: string }[] = [
  { value: 'game', label: '游戏' }, { value: 'star', label: '追星' },
  { value: 'novel', label: '小说' }, { value: 'merch', label: '周边' }, { value: 'general', label: '通用' },
];
const TYPE_OPTS = Object.entries(REMINDER_TYPE_LABEL).map(([value, label]) => ({ value, label }));

function ReminderEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [d, setD] = useState<any>({});
  const set = (p: any) => setD({ ...d, ...p });
  const save = async () => {
    if (!d.title?.trim()) { toast.error('请填写提醒标题'); return; }
    const now = Date.now();
    await db.reminders.add({ id: uid(), createdAt: now, updatedAt: now, deletedAt: null,
      title: d.title, module: d.module || 'general', targetId: null, type: d.type || 'anniversary',
      datetime: d.datetime || '', repeat: d.repeat || 'none', advance: d.advance ?? 0, priority: d.priority || '中', status: 'pending', note: d.note || '' });
    toast.success('已添加提醒'); onOpenChange(false);
  };
  return (
    <EditorModal title="新建提醒" open={open} onOpenChange={onOpenChange} onSave={save}>
      <TextInput label="标题" value={d.title || ''} onChange={v => set({ title: v })} placeholder="如：星轨幻想 卡池结束" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="模块" value={d.module || 'general'} onChange={v => set({ module: v })} options={MODULE_OPTS} />
        <SelectField label="类型" value={d.type || 'anniversary'} onChange={v => set({ type: v })} options={TYPE_OPTS} />
      </div>
      <DateInput label="日期时间" value={d.datetime || ''} onChange={v => set({ datetime: v })} />
      <TextInput label="优先级" value={d.priority || '中'} onChange={v => set({ priority: v })} placeholder="高/中/低" />
      <AreaInput label="备注" value={d.note || ''} onChange={v => set({ note: v })} />
    </EditorModal>
  );
}

export default function Reminders() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const reminders = useLiveQuery(() => db.reminders.filter(r => !r.deletedAt).toArray(), [], []) || [];
  const today = new Date().toDateString();

  const groups = {
    all: reminders,
    today: reminders.filter(r => r.status === 'pending' && new Date(r.datetime).toDateString() === today),
    soon: reminders.filter(r => r.status === 'pending' && daysUntil(r.datetime)! > 0 && daysUntil(r.datetime)! <= 7),
    expired: reminders.filter(r => r.status === 'pending' && daysUntil(r.datetime)! < 0),
    done: reminders.filter(r => r.status === 'done'),
  };

  const markDone = async (r: Reminder) => { await db.reminders.update(r.id, { status: 'done', updatedAt: Date.now() }); toast('已完成'); };

  const renderList = (list: Reminder[]) => {
    if (list.length === 0) return <Empty icon="🔔" text="这里空空如也" />;
    return (
      <div className="flex flex-col gap-2 px-3">
        {[...list].sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)).map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <button onClick={() => markDone(r)} className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${r.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40'}`}>
              {r.status === 'done' && <Check className="size-4" />}
            </button>
            <div className="min-w-0 flex-1" onClick={() => r.targetId && navigate(`/${r.module === 'game' ? 'games' : r.module === 'star' ? 'stars' : r.module === 'novel' ? 'novels' : r.module === 'merch' ? 'merch' : 'profile'}/${r.targetId}`)}>
              <p className={`truncate text-sm font-medium ${r.status === 'done' ? 'line-through opacity-50' : ''}`}>{r.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDateTime(r.datetime)} · {REMINDER_TYPE_LABEL[r.type]}</p>
            </div>
            {r.status === 'pending' && <span className="shrink-0 text-xs font-medium text-primary">{countdownText(r.datetime)}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="提醒" right={<Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> 新建</Button>} />
      <Tabs defaultValue="all" className="px-3 pt-2">
        <TabsList className="w-full">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="today">今天</TabsTrigger>
          <TabsTrigger value="soon">即将</TabsTrigger>
          <TabsTrigger value="expired">已过</TabsTrigger>
          <TabsTrigger value="done">已完成</TabsTrigger>
        </TabsList>
        {Object.entries(groups).map(([k, list]) => (
          <TabsContent key={k} value={k} className="pt-2">{renderList(list as Reminder[])}</TabsContent>
        ))}
      </Tabs>
      <div className="h-4" />
      <ReminderEditor open={open} onOpenChange={setOpen} />
    </div>
  );
}
