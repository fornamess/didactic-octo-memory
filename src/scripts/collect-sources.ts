import fs from 'fs';
import path from 'path';

// Определяем корень проекта (предполагается, что скрипт запускается из корня проекта)
const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'allsource.txt');

// Расширения файлов, которые нужно включить
const INCLUDED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
// Расширения файлов, которые нужно исключить
const EXCLUDED_EXTENSIONS = ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
// Имена файлов/папок, которые нужно исключить
const EXCLUDED_PATTERNS = ['node_modules', '.next', '.git', 'allsource.txt'];

function shouldIncludeFile(filePath: string, fileName: string): boolean {
  // Проверяем исключенные паттерны
  const relativePath = path.relative(SRC_DIR, filePath);
  for (const pattern of EXCLUDED_PATTERNS) {
    if (relativePath.includes(pattern)) {
      return false;
    }
  }

  // Проверяем расширения файлов
  const ext = path.extname(fileName).toLowerCase();

  // Исключаем бинарные файлы
  if (EXCLUDED_EXTENSIONS.includes(ext)) {
    return false;
  }

  // Если файл имеет допустимое расширение, включаем его
  if (INCLUDED_EXTENSIONS.includes(ext)) {
    return true;
  }

  // Если файл без расширения, но не в списке исключений - проверяем содержимое
  if (!ext) {
    return false; // Без расширения - не включаем по умолчанию
  }

  return false;
}

function collectFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Рекурсивно обходим поддиректории
      collectFiles(filePath, fileList);
    } else if (stat.isFile() && shouldIncludeFile(filePath, file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}:`, error);
    return `// Ошибка чтения файла: ${filePath}\n`;
  }
}

function main() {
  console.log('Начинаю сбор всех исходников из папки src...');

  // Получаем все файлы
  const files = collectFiles(SRC_DIR);

  console.log(`Найдено файлов: ${files.length}`);

  // Сортируем файлы по пути для удобства
  files.sort();

  let output = '';
  output += '='.repeat(80) + '\n';
  output += `СБОР ВСЕХ ИСХОДНИКОВ ИЗ ПАПКИ SRC\n`;
  output += `Дата создания: ${new Date().toLocaleString('ru-RU')}\n`;
  output += `Всего файлов: ${files.length}\n`;
  output += '='.repeat(80) + '\n\n';

  files.forEach((filePath, index) => {
    const relativePath = path.relative(SRC_DIR, filePath);
    const content = readFileContent(filePath);

    output += '\n' + '='.repeat(80) + '\n';
    output += `ФАЙЛ ${index + 1}/${files.length}: ${relativePath}\n`;
    output += `Полный путь: ${filePath}\n`;
    output += '='.repeat(80) + '\n\n';
    output += content;
    output += '\n\n';
  });

  // Записываем в файл
  try {
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log(`\nГотово! Все исходники сохранены в файл: ${OUTPUT_FILE}`);
    console.log(`Размер файла: ${(Buffer.byteLength(output, 'utf-8') / 1024 / 1024).toFixed(2)} МБ`);
  } catch (error) {
    console.error('Ошибка при записи файла:', error);
    process.exit(1);
  }
}

main();
