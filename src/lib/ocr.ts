import { createWorker, type Worker } from 'tesseract.js'

// Все файлы OCR (wasm-ядро, языковые данные, worker) лежат в public/uploads/ocr,
// поэтому распознавание работает полностью в браузере, без внешних сервисов.
const base = `${import.meta.env.BASE_URL}uploads/ocr/`

let workerPromise: Promise<Worker> | null = null

function getWorker(onProgress: (value: number) => void): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(['rus', 'eng'], 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      gzip: true,
      logger: (message) => {
        if (message.status === 'recognizing text') onProgress(Math.round(message.progress * 100))
      },
    }).catch((error: unknown) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

export async function recognizeIngredients(image: File, onProgress: (value: number) => void): Promise<string> {
  const worker = await getWorker(onProgress)
  const { data } = await worker.recognize(image)
  return data.text.replace(/\s+/g, ' ').trim()
}
