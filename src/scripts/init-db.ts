import { initDb } from '../lib/db';

async function main() {
  console.log('Initializing database...');
  await initDb();
  console.log('Database initialized successfully!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error initializing database:', error);
  process.exit(1);
});
