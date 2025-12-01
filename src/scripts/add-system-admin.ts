import { initDb, getUserByEmail, createUser } from '../lib/db';
import { hashPassword } from '../lib/auth';

// Данные системного администратора
const SYSTEM_ADMIN = {
  email: 'system@gmail.com',
  password: 'I8378HVGDSKAHGFIO473IEUWH@UKGHLFDHLKZ;O;L;',
  nickname: 'System Admin',
  firstName: 'System',
  lastName: 'Administrator',
};

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
      return;
    }

    console.log('Хеширование пароля...');
    const hashedPassword = await hashPassword(SYSTEM_ADMIN.password);

    console.log('Создание системного администратора...');
    const userId = await createUser(
      SYSTEM_ADMIN.email,
      hashedPassword,
      SYSTEM_ADMIN.nickname,
      SYSTEM_ADMIN.firstName,
      SYSTEM_ADMIN.lastName
    );

    console.log('✅ Системный администратор успешно создан!');
    console.log(`ID: ${userId}`);
    console.log(`Email: ${SYSTEM_ADMIN.email}`);
    console.log(`Nickname: ${SYSTEM_ADMIN.nickname}`);
    console.log('\n🔐 Данные для входа:');
    console.log(`Email: ${SYSTEM_ADMIN.email}`);
    console.log(`Пароль: ${SYSTEM_ADMIN.password}`);
  } catch (error) {
    console.error('❌ Ошибка при создании системного администратора:', error);
    process.exit(1);
  }
}

// Запуск скрипта
addSystemAdmin();
