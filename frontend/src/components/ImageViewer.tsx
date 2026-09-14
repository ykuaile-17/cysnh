import { useState } from 'react';
import { X } from 'lucide-react';

// 全屏大图查看器：点击缩略图后弹出，可关闭
export function Lightbox({ src, open, onOpenChange }: { src: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={() => onOpenChange(false)}
    >
      <button
        className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
        onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
        aria-label="关闭"
      >
        <X className="size-5" />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// 可点击放大的图片：列表/详情中显示缩略图，点击打开大图
export function ZoomableImage({
  src, alt = '', className = '', imgClassName = 'h-full w-full object-cover',
}: { src: string; alt?: string; className?: string; imgClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <img src={src} alt={alt} className={imgClassName} />
      </button>
      <Lightbox src={src} open={open} onOpenChange={setOpen} />
    </>
  );
}
