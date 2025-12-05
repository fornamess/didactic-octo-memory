import crypto from 'crypto';
import { hashPassword } from '../lib/auth';
import { createUser, getUserByEmail, initDb } from '../lib/db';

// Данные системного администратора
const SYSTEM_ADMIN = {
  email: 'system@gmail.com',
  nickname: 'System Admin',
  firstName: 'System',
  lastName: 'Administrator',
};

// Генерируем случайный пароль при каждом запуске скрипта
function generateRandomPassword(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function addSystemAdmin() {
  try {
    console.log('Инициализация базы данных...');
    await initDb();

    console.log('Проверка существования системного администратора...');
    const existingUser = await getUserByEmail(SYSTEM_ADMIN.email);

    if (existingUser) {
      console.log('⚠️  Системный администратор уже существует в базе данных.');
      console.log(`ID: ${existingUser.id}`);
      console.log(`Email: ${existingUser.email}`);
      console.log(`Nickname: ${existingUser.nickname}`);
      console.log(
        '\n💡 Для сброса пароля используйте функцию восстановления пароля или удалите пользователя из БД.'
      );
      return;
    }

    // Генерируем случайный пароль
    const generatedPassword = generateRandomPassword();
    console.log('Генерация случайного пароля...');

    console.log('Хеширование пароля...');
    const hashedPassword = await hashPassword(generatedPassword);

    console.log('Создание системного администратора...');
    const userId = await createUser(
      SYSTEM_ADMIN.email,
      hashedPassword,
      SYSTEM_ADMIN.nickname,
      SYSTEM_ADMIN.firstName,
      SYSTEM_ADMIN.lastName
    );

    console.log('\n' + '='.repeat(60));
    console.log('✅ Системный администратор успешно создан!');
    console.log('='.repeat(60));
    console.log(`ID: ${userId}`);
    console.log(`Email: ${SYSTEM_ADMIN.email}`);
    console.log(`Nickname: ${SYSTEM_ADMIN.nickname}`);
    console.log('\n🔐 ВАЖНО: Сохраните эти данные в безопасном месте!');
    console.log('='.repeat(60));
    console.log(`Email: ${SYSTEM_ADMIN.email}`);
    console.log(`Пароль: ${generatedPassword}`);
    console.log('='.repeat(60));
    console.log('\n⚠️  Этот пароль показан только один раз. Если вы его потеряете,');
    console.log('   используйте функцию восстановления пароля или удалите пользователя из БД.');
  } catch (error) {
    console.error('❌ Ошибка при создании системного администратора:', error);
    process.exit(1);
  }
}

// Запуск скрипта
addSystemAdmin();
