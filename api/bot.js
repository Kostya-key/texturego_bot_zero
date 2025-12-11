import { Telegraf } from 'telegraf';
import { processImageToTexture } from './utils/imageProcessor.js';

// Инициализация бота
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('❌ BOT_TOKEN не найден в Environment Variables Vercel!');
}
const bot = new Telegraf(BOT_TOKEN);

// ========== КОМАНДЫ БОТА ==========
bot.command('start', async (ctx) => {
  console.log(`👤 /start от ${ctx.from.id} (@${ctx.from.username})`);
  await ctx.replyWithMarkdown(
    `*🎨 TextureBot | MVP* \\n\\n` +
    `Я создаю *бесшовные (tileable) текстуры* из ваших фотографий.\\n\\n` +
    `*📸 Как использовать:*\\n` +
    `1. Сфотографируйте поверхность (стена, дерево, ткань)\\n` +
    `2. Отправьте фото *без сжатия* (как файл, если возможно)\\n` +
    `3. Получите текстуру 2048×2048 PNG\\n\\n` +
    `*🎯 Советы для лучшего результата:*\\n` +
    `• Фотографируйте близко и параллельно поверхности\\n` +
    `• Хорошее освещение, без резких теней\\n` +
    `• Избегайте перспективных искажений\\n\\n` +
    `*Просто отправьте мне фото!*`
  );
});

bot.command('help', (ctx) => {
  ctx.reply(
    'Отправьте фото любой поверхности. Я создам из неё текстуру для 3D графики или игр.\n\n' +
    'Для начала работы используйте /start'
  );
});

bot.command('status', (ctx) => {
  ctx.reply('✅ Бот работает исправно! Сервер: Vercel, время ответа: < 10 сек.');
});

// ========== ОБРАБОТКА ФОТО ==========
bot.on('photo', async (ctx) => {
  const startTime = Date.now();
  const chatId = ctx.message.chat.id;
  const messageId = ctx.message.message_id;
  
  // Сообщение о начале обработки
  const statusMsg = await ctx.reply('🔄 *Принял фото. Начинаю обработку...*', {
    parse_mode: 'Markdown',
    reply_to_message_id: messageId
  });
  
  try {
    console.log(`📸 Обработка фото от ${ctx.from.id}`);
    
    // 1. Получаем file_id самого качественного фото
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    
    // 2. Получаем информацию о файле
    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    console.log(`📥 Ссылка на файл: ${fileUrl.substring(0, 80)}...`);
    
    // 3. Обновляем статус
    await ctx.telegram.editMessageText(
      chatId,
      statusMsg.message_id,
      null,
      '🔄 *Загружаю и анализирую изображение...*',
      { parse_mode: 'Markdown' }
    );
    
    // 4. ОСНОВНАЯ ЛОГИКА: создаём текстуру
    const { textureBuffer, textureInfo } = await processImageToTexture(fileUrl);
    
    // 5. Обновляем статус
    await ctx.telegram.editMessageText(
      chatId,
      statusMsg.message_id,
      null,
      `✅ *Текстура готова!*\\n\\n${textureInfo}\\n\\n*Отправляю файл...*`,
      { parse_mode: 'Markdown' }
    );
    
    // 6. Отправляем текстуру пользователю
    await ctx.replyWithDocument(
      {
        source: textureBuffer,
        filename: `texture_${Date.now()}.png`
      },
      {
        caption: `🎨 *Ваша текстура готова!*\n\n${textureInfo}\n\n⏱ Время обработки: ${Date.now() - startTime}мс`,
        parse_mode: 'Markdown',
        reply_to_message_id: messageId
      }
    );
    
    // 7. Финальное обновление статуса
    await ctx.telegram.editMessageText(
      chatId,
      statusMsg.message_id,
      null,
      `✅ *Готово! Текстура отправлена.*\\n\\nМожно отправлять следующее фото.`,
      { parse_mode: 'Markdown' }
    );
    
    console.log(`✅ Успешно обработал фото за ${Date.now() - startTime}мс`);
    
  } catch (error) {
    console.error('💥 Ошибка обработки фото:', error);
    
    // Обновляем сообщение об ошибке
    await ctx.telegram.editMessageText(
      chatId,
      statusMsg.message_id,
      null,
      `❌ *Ошибка обработки*\\n\\n${error.message}\\n\\nПопробуйте другое изображение.`,
      { parse_mode: 'Markdown' }
    );
    
    // Отправляем дополнительное сообщение с подсказкой
    ctx.reply(
      'Возможные причины:\n' +
      '• Слишком большое изображение\n' +
      '• Неподдерживаемый формат\n' +
      '• Проблемы с загрузкой файла\n\n' +
      'Попробуйте отправить фото меньшего размера или как документ.'
    );
  }
});

// ========== ОБРАБОТКА ДОКУМЕНТОВ (если фото отправлено как файл) ==========
bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  const mimeType = doc.mime_type;
  
  if (mimeType && mimeType.startsWith('image/')) {
    // Трактуем как фото и запускаем обработку
    ctx.message.photo = [{ file_id: doc.file_id, file_size: doc.file_size }];
    bot.handleUpdate({ message: ctx.message, update_id: Date.now() });
  } else {
    ctx.reply('📸 Пожалуйста, отправьте изображение (JPEG, PNG, etc.)');
  }
});

// ========== ОБРАБОТКА ВСЕХ СООБЩЕНИЙ ==========
bot.on('message', (ctx) => {
  if (ctx.message.text && !ctx.message.text.startsWith('/')) {
    ctx.reply('📸 Отправьте мне фото поверхности для создания текстуры!');
  }
});

// ========== ОБРАБОТЧИК ВЕБХУКА ДЛЯ VERCEL ==========
export default async function handler(req, res) {
  console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Для GET запросов (проверка работоспособности)
  if (req.method === 'GET') {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>🎨 TextureBot Status</title>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            .status { background: #22c55e; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>🎨 TextureBot</h1>
          <p><span class="status">✅ Активен</span></p>
          <p>Telegram вебхук работает корректно.</p>
          <p>Токен бота: <code>${BOT_TOKEN ? 'Установлен' : 'Не найден!'}</code></p>
          <p>Отправьте <code>/start</code> вашему боту в Telegram.</p>
        </body>
      </html>
    `);
  }
  
  // Для POST запросов (вебхук от Telegram)
  if (req.method === 'POST') {
    try {
      // Читаем тело запроса
      const rawBody = await getRawBody(req);
      const update = JSON.parse(rawBody.toString('utf8'));
      
      // Передаём обновление боту
      await bot.handleUpdate(update);
      
      // Отвечаем Telegram, что всё ок
      return res.status(200).json({ ok: true });
      
    } catch (error) {
      console.error('💥 Ошибка в вебхуке:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Internal Server Error',
        details: error.message 
      });
    }
  }
  
  // Для всех остальных методов HTTP
  return res.status(405).send('Method Not Allowed');
}

// Вспомогательная функция для чтения тела запроса
async function getRawBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Обработчик ошибок бота
bot.catch((err, ctx) => {
  console.error(`💥 Ошибка бота для ${ctx.updateType}:`, err);
  ctx.reply('❌ Произошла внутренняя ошибка бота. Попробуйте еще раз.');
});
