import { ReactNode, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Link2 } from 'lucide-react';
import { ImagePicker } from '@/components/ImagePicker';
import { parseLink } from '@/lib/linkparse';
import { toast } from 'sonner';

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className || ''}`}>
      <Label className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function EditorModal({
  title, open, onOpenChange, onSave, children, saveText = '保存',
}: {
  title: string; open: boolean; onOpenChange: (v: boolean) => void;
  onSave: () => void; children: ReactNode; saveText?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">{children}</div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button onClick={onSave}>{saveText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SelectField({
  label, value, onChange, options, placeholder = '请选择',
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TextInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <Field label={label}>
      <Input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </Field>
  );
}

export function NumInput({ label, value, onChange, placeholder }: {
  label: string; value: number | string; onChange: (v: number) => void; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input type="number" value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(Number(e.target.value) || 0)} />
    </Field>
  );
}

export function DateInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Input type="date" value={value} onChange={e => onChange(e.target.value)} />
    </Field>
  );
}

export function AreaInput({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <Field label={label}>
      <Textarea rows={rows} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </Field>
  );
}

export function ImageField({ label = '图片', value, onChange }: {
  label?: string; value?: string; onChange: (v: string | undefined) => void;
}) {
  return <ImagePicker value={value} onChange={onChange} label={label} />;
}

export function LinkField({ label = '链接', value, onChange, onResolved }: {
  label?: string; value: string; onChange: (v: string) => void;
  onResolved?: (r: { title: string; image: string; platform: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const parse = async () => {
    if (!value.trim()) { toast.error('请先粘贴链接'); return; }
    setLoading(true);
    try {
      const r = await parseLink(value.trim());
      onResolved?.(r);
      if (r.title) toast.success(`已识别：${r.platform} · ${r.title.slice(0, 16)}`);
      else toast('已尝试解析，未拿到标题');
    } catch {
      toast.error('解析失败，请手动填写');
    } finally { setLoading(false); }
  };
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input value={value} placeholder="粘贴 B站/微博/淘宝/闲鱼 链接" onChange={e => onChange(e.target.value)} />
        <Button type="button" variant="outline" size="sm" onClick={parse} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} 解析
        </Button>
      </div>
    </Field>
  );
}
