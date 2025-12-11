import { createCanvas, loadImage } from 'canvas';
import { makeTileable } from './tileable.js';
import { generateNormalMap } from './normalMap.js';

/**
 * Основная функция: загружает изображение и создаёт текстуру
 * @param {string} imageUrl - URL изображения
 * @returns {Promise<{textureBuffer: Buffer, textureInfo: string}>}
 */
export async function processImageToTexture(imageUrl) {
  console.log('🔄 Начинаю обработку изображения...');
  
  try {
    // 1. Загружаем изображение
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    console.log(`📥 Изображение загружено: ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    
    // 2. Загружаем в Canvas
    const image = await loadImage(Buffer.from(imageBuffer));
    console.log(`📐 Размер исходного изображения: ${image.width}×${image.height}`);
    
    // 3. Определяем целевой размер текстуры (2K для MVP)
    const targetSize = 2048;
    
    // 4. Создаём canvas и рисуем изображение
    const canvas = createCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');
    
    // 5. Рисуем изображение с масштабированием (вписываем в квадрат)
    ctx.drawImage(image, 0, 0, targetSize, targetSize);
    
    // 6. Применяем алгоритм создания бесшовной текстуры
    console.log('🔄 Применяю алгоритм создания бесшовной текстуры...');
    const tileableCanvas = await makeTileable(canvas, {
      size: targetSize,
      blendEdges: true,
      enhanceDetails: true
    });
    
    // 7. Генерируем информацию о текстуре
    const textureInfo = [
      `Размер: ${targetSize}×${targetSize} пикселей`,
      `Формат: PNG (сжатие без потерь)`,
      `Тип: Диффузная карта (Diffuse/Albedo)`,
      `Повторяемость: Бесшовная (Tileable)`,
      `Исходник: ${image.width}×${image.height} → ${targetSize}×${targetSize}`
    ].join('\n');
    
    // 8. Конвертируем в PNG buffer
    const textureBuffer = tileableCanvas.toBuffer('image/png');
    console.log(`✅ Текстура создана: ${(textureBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return { textureBuffer, textureInfo };
    
  } catch (error) {
    console.error('💥 Ошибка в processImageToTexture:', error);
    throw error;
  }
}

/**
 * Упрощённая версия для быстрого старта
 */
export async function createSimpleTexture(imageUrl) {
  const response = await fetch(imageUrl);
  const imageBuffer = await response.arrayBuffer();
  const image = await loadImage(Buffer.from(imageBuffer));
  
  const size = 1024; // Меньший размер для скорости
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Простое масштабирование
  ctx.drawImage(image, 0, 0, size, size);
  
  // Базовое создание tileable (зеркальные края)
  const tileSize = size / 8;
  for (let i = 0; i < size; i += tileSize) {
    // Зеркалим верхнюю границу на нижнюю
    ctx.drawImage(canvas, i, 0, tileSize, tileSize, i, size - tileSize, tileSize, tileSize);
    // Зеркалим левую границу на правую
    ctx.drawImage(canvas, 0, i, tileSize, tileSize, size - tileSize, i, tileSize, tileSize);
  }
  
  return {
    textureBuffer: canvas.toBuffer('image/png'),
    textureInfo: `Быстрая текстура ${size}×${size} (базовый алгоритм)`
  };
}
