import { ImagePlus, X } from 'lucide-react';
import { pickImage } from '@/lib/images';

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
