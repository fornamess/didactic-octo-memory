import fs from 'fs';
import path from 'path';

const YES_AI_API_BASE = 'https://api.yesai.su/v2';
const YES_AI_TOKEN = 'yes-a33661358cdd84069ef3fcbb6e65b43c380d70104b34519ba37d268d785d';

// Пути к универсальным видео
const VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos');
const INTRO_PATH = path.join(VIDEOS_DIR, 'intro.mp4');
const OUTRO_PATH = path.join(VIDEOS_DIR, 'outro.mp4');

// Промпты для универсальных частей
const INTRO_PROMPT = `Дед Мороз в традиционной русской красной шубе с белым мехом сидит у стола в уютной комнате. На фоне большая украшенная новогодняя ёлка с гирляндами и игрушками, горит камин, за окном падает снег. Тёплое освещение создаёт волшебную атмосферу. Дед Мороз добро улыбается, открывает волшебную книгу и начинает говорить в камеру. Он машет рукой в приветствии. Атмосфера сказочная, праздничная, уютная. Качество видео высокое, кинематографичное.`;

const OUTRO_PROMPT = `Дед Мороз в традиционной русской красной шубе стоит у украшенной новогодней ёлки с подарками. Вокруг летают снежинки и волшебные искры. Он поднимает руку в прощальном жесте, посох светится магическим светом. Камера плавно отъезжает, показывая всю красоту зимней сказки. В кадре появляются золотые надписи "С Новым 2026 Годом!". Атмосфера торжественная и волшебная.`;

interface GenerationResult {
  success: boolean;
  taskId?: number;
  error?: string;
}

interface StatusResult {
  success: boolean;
  status: string;
  videoUrl?: string;
  error?: string;
}

// Проверка существования универсальных видео
export function checkUniversalVideosExist(): { intro: boolean; outro: boolean } {
  return {
    intro: fs.existsSync(INTRO_PATH),
    outro: fs.existsSync(OUTRO_PATH),
  };
}

// Создание задания на генерацию видео
export async function createVideoTask(
  prompt: string,
  customerId: string
): Promise<GenerationResult> {
  try {
    const response = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YES_AI_TOKEN}`,
      },
      body: JSON.stringify({
        version: '2',
        prompt: prompt,
        customer_id: customerId,
        resolution: 720,
        dimensions: '16:9',
        duration: 20, // Максимум 20 секунд чтобы Дед Мороз успел всё сказать
      }),
    });

    const responseText = await response.text();
    console.log('Yes AI API response status:', response.status);
    console.log('Yes AI API response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Ошибка парсинга ответа: ${responseText}` };
    }

    if (!data.success) {
      console.error('Yes AI API error:', data.message);
      return { success: false, error: data.message };
    }

    const taskId = data.results?.animation_data?.id;
    if (!taskId) {
      return { success: false, error: 'Не получен ID задания' };
    }

    return { success: true, taskId };
  } catch (error) {
    console.error('Create video task error:', error);
    return { success: false, error: 'Ошибка создания задания' };
  }
}

// Проверка статуса задания
export async function checkTaskStatus(taskId: number): Promise<StatusResult> {
  try {
    const response = await fetch(`${YES_AI_API_BASE}/yesvideo/animations/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YES_AI_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!data.success) {
      return { success: false, status: 'error', error: data.message };
    }

    const animationData = data.results?.animation_data;
    if (!animationData) {
      return { success: false, status: 'error', error: 'Данные не найдены' };
    }

    return {
      success: true,
      status: animationData.status_description,
      videoUrl: animationData.result_url || undefined,
    };
  } catch (error) {
    console.error('Check task status error:', error);
    return { success: false, status: 'error', error: 'Ошибка проверки статуса' };
  }
}

// Скачивание видео по URL
export async function downloadVideo(url: string, savePath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download video');
    }

    const buffer = await response.arrayBuffer();

    // Создаём директорию если не существует
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(savePath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error('Download video error:', error);
    return false;
  }
}

// Генерация промпта для персонального блока
export function generatePersonalPrompt(
  childName: string,
  photo1Comment: string,
  photo2Comment: string
): string {
  return `Дед Мороз в красной шубе сидит в уютной комнате с ёлкой. Он смотрит в камеру и произносит слова, обращаясь к ребёнку по имени ${childName}. В кадре появляется мягкое сияние, показывающее воспоминание о ребёнке - "${photo1Comment}". Затем плавный снежный переход к другому моменту - "${photo2Comment}". Дед Мороз улыбается с теплотой и гордостью. Атмосфера волшебная, персональная, тёплая. Качество видео высокое.`;
}

// Генерация универсального интро (вызывается если файла нет)
export async function generateIntroVideo(customerId: string): Promise<GenerationResult> {
  console.log('Generating intro video...');
  return createVideoTask(INTRO_PROMPT, customerId);
}

// Генерация универсального финала (вызывается если файла нет)
export async function generateOutroVideo(customerId: string): Promise<GenerationResult> {
  console.log('Generating outro video...');
  return createVideoTask(OUTRO_PROMPT, customerId);
}

// Сохранение интро видео
export async function saveIntroVideo(videoUrl: string): Promise<boolean> {
  console.log('Saving intro video to:', INTRO_PATH);
  return downloadVideo(videoUrl, INTRO_PATH);
}

// Сохранение финала
export async function saveOutroVideo(videoUrl: string): Promise<boolean> {
  console.log('Saving outro video to:', OUTRO_PATH);
  return downloadVideo(videoUrl, OUTRO_PATH);
}

// Получение путей к универсальным видео
export function getUniversalVideoPaths() {
  return {
    intro: INTRO_PATH,
    outro: OUTRO_PATH,
    introExists: fs.existsSync(INTRO_PATH),
    outroExists: fs.existsSync(OUTRO_PATH),
  };
}

// Склейка видео с помощью ffmpeg
export async function concatenateVideos(
  introPath: string,
  personalPath: string,
  outroPath: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Динамический импорт fluent-ffmpeg
      import('fluent-ffmpeg')
        .then((ffmpegModule) => {
          const ffmpeg = ffmpegModule.default;

          // Устанавливаем путь к ffmpeg
          const ffmpegPath = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\ffmpeg\\bin\\ffmpeg.exe';
          ffmpeg.setFfmpegPath(ffmpegPath);

          // Создаём временный файл со списком видео для конкатенации
          const listPath = path.join(path.dirname(outputPath), 'concat_list.txt');
          const listContent = `file '${introPath.replace(/\\/g, '/')}'
file '${personalPath.replace(/\\/g, '/')}'
file '${outroPath.replace(/\\/g, '/')}'`;

          fs.writeFileSync(listPath, listContent);

          ffmpeg()
            .input(listPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions(['-c', 'copy'])
            .output(outputPath)
            .on('end', () => {
              // Удаляем временный файл
              fs.unlinkSync(listPath);
              console.log('Video concatenation completed:', outputPath);
              resolve(true);
            })
            .on('error', (err: Error) => {
              console.error('FFmpeg error:', err);
              // Удаляем временный файл при ошибке
              if (fs.existsSync(listPath)) {
                fs.unlinkSync(listPath);
              }
              resolve(false);
            })
            .run();
        })
        .catch((err) => {
          console.error('FFmpeg import error:', err);
          resolve(false);
        });
    } catch (error) {
      console.error('Concatenate videos error:', error);
      resolve(false);
    }
  });
}

// Путь к папке с персональными видео
export function getPersonalVideoPath(orderId: number): string {
  const personalDir = path.join(VIDEOS_DIR, 'personal');
  if (!fs.existsSync(personalDir)) {
    fs.mkdirSync(personalDir, { recursive: true });
  }
  return path.join(personalDir, `personal_${orderId}.mp4`);
}

// Путь к финальному склеенному видео
export function getFinalVideoPath(orderId: number): string {
  const finalDir = path.join(VIDEOS_DIR, 'final');
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  return path.join(finalDir, `final_${orderId}.mp4`);
}
