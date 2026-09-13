import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
