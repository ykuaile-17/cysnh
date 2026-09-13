import { ImagePlus, X } from 'lucide-react';
import { pickImage } from '@/lib/images';
import { toast } from 'sonner';

export function ImagePicker({
  value, onChange, label = '图片',
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 overflow-hidden rounded-xl border bg-muted/40">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm active:scale-95"
            onClick={() => pickImage((url) => onChange(url))}
          >
            {value ? '重新选择' : '上传/拍照'}
          </button>
          {value && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-destructive active:scale-95"
              onClick={() => onChange(undefined)}
            >
              <X className="size-3.5" /> 移除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 多图选择器：支持一次选择多张，可删除、可继续添加
export function MultiImagePicker({
  value = [], onChange, label = '图片', max,
}: {
  value?: string[];
  onChange: (v: string[]) => void;
  label?: string;
  max?: number;
}) {
  const add = () => {
    if (max && value.length >= max) { toast.error('已达到最大数量'); return; }
    pickImage((url) => onChange([...value, url].slice(0, max ?? 99)), { multiple: true });
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}{max ? `（最多 ${max} 张）` : ''}</span>
      <div className="flex flex-wrap gap-2">
        {value.map((img, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border bg-muted/40">
            <img src={img} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-0.5 top-0.5 rounded-full bg-black/55 p-0.5 text-white active:scale-90"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {(!max || value.length < max) && (
          <button
            type="button"
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-muted-foreground active:scale-95"
            onClick={add}
          >
            <ImagePlus className="size-5" />
            <span className="text-xs">添加</span>
          </button>
        )}
      </div>
    </div>
  );
}
