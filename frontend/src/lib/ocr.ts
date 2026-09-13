// 本地 OCR：使用 tesseract.js 在手机端离线识别截图文字
// 首次调用会按需下载识别引擎与中文词库（联网一次，之后缓存）
export async function ocrImage(dataUrl: string, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('chi_sim+eng', 1, {
    logger: (m: any) => {
      if (onProgress && m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
    },
  });
  const { data } = await worker.recognize(dataUrl);
  await worker.terminate();
  return data.text;
}

// 从识别文本里抽取所有整数（用于抽数、金额等）
export function extractNumbers(text: string): number[] {
  const nums = text.match(/\d{1,7}/g);
  return nums ? nums.map(Number).filter(n => n > 0) : [];
}

// 抽取金额（¥ 后数字，或独立的小数/整数）
export function extractAmount(text: string): number | null {
  const y = text.match(/[¥￥]\s*(\d+(?:\.\d+)?)/);
  if (y) return Number(y[1]);
  const nums = extractNumbers(text);
  return nums.length ? nums[nums.length - 1] : null;
}
