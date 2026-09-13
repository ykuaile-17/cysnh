// 图片工具：把用户选择的图片文件转成 dataURL 存入 IndexedDB
// 移动端支持拍照（capture）与相册选择

export function fileToDataUrl(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取失败'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // 原图已较小则直接返回
      if (!file.type.startsWith('image/') || file.size < 400 * 1024) {
        resolve(dataUrl);
        return;
      }
      compress(dataUrl, maxSize).then(resolve).catch(() => resolve(dataUrl));
    };
    reader.readAsDataURL(file);
  });
}

function compress(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('img'));
    img.src = dataUrl;
  });
}

// 统一唤起图片选择（相册/拍照），通过回调返回 dataURL
export function pickImage(onPick: (dataUrl: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    fileToDataUrl(file).then(onPick).catch(() => {});
  };
  input.click();
}
