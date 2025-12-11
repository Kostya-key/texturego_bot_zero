import { createCanvas } from 'canvas';

/**
 * Создаёт бесшовную (tileable) текстуру из изображения
 * @param {Canvas} sourceCanvas - Исходный canvas
 * @param {Object} options - Настройки
 * @returns {Canvas} Canvas с бесшовной текстурой
 */
export function makeTileable(sourceCanvas, options = {}) {
  const {
    size = 2048,
    blendEdges = true,
    blendWidth = 64,
    enhanceDetails = false
  } = options;
  
  console.log(`🔄 Создание бесшовной текстуры ${size}×${size}...`);
  
  // Создаём новый canvas
  const resultCanvas = createCanvas(size, size);
  const ctx = resultCanvas.getContext('2d');
  
  // 1. Копируем исходное изображение
  ctx.drawImage(sourceCanvas, 0, 0, size, size);
  
  // 2. Применяем алгоритм "зеркального отражения краёв"
  if (blendEdges) {
    // Создаём временный canvas для операций с краями
    const tempCanvas = createCanvas(size, size);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(sourceCanvas, 0, 0, size, size);
    
    // Берем полосы с краёв и зеркально отражаем
    const edgeData = tempCtx.getImageData(0, 0, size, blendWidth);
    ctx.putImageData(edgeData, 0, size - blendWidth);
    
    const leftEdgeData = tempCtx.getImageData(0, 0, blendWidth, size);
    ctx.putImageData(leftEdgeData, size - blendWidth, 0);
    
    // Размываем границы для плавного перехода
    ctx.filter = 'blur(4px)';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(resultCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
  }
  
  // 3. Улучшаем детализацию (опционально)
  if (enhanceDetails) {
    enhanceTextureDetails(ctx, size);
  }
  
  console.log('✅ Бесшовная текстура создана');
  return resultCanvas;
}

/**
 * Улучшает детализацию текстуры
 */
function enhanceTextureDetails(ctx, size) {
  // Простое увеличение контраста для деталей
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Немного увеличиваем контраст
    data[i] = Math.min(255, data[i] * 1.1);     // R
    data[i + 1] = Math.min(255, data[i + 1] * 1.1); // G
    data[i + 2] = Math.min(255, data[i + 2] * 1.1); // B
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Быстрый алгоритм для MVP
 */
export function makeTileableSimple(sourceCanvas) {
  const size = sourceCanvas.width;
  const resultCanvas = createCanvas(size, size);
  const ctx = resultCanvas.getContext('2d');
  
  // Просто копируем и немного размываем края
  ctx.drawImage(sourceCanvas, 0, 0);
  
  // Добавляем зеркальные края шириной 10%
  const edgeWidth = Math.floor(size * 0.1);
  
  // Верх → Низ
  const topEdge = ctx.getImageData(0, 0, size, edgeWidth);
  ctx.putImageData(topEdge, 0, size - edgeWidth);
  
  // Лево → Право
  const leftEdge = ctx.getImageData(0, 0, edgeWidth, size);
  ctx.putImageData(leftEdge, size - edgeWidth, 0);
  
  return resultCanvas;
}
