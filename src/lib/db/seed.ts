import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';

async function seed(): Promise<void> {
  try {
    const existing = db.select().from(settings).all();

    if (existing.length === 0) {
      db.insert(settings).values({
        id: 1,
      }).run();
      console.log('Default settings inserted.');
    } else {
      console.log('Settings already exist, skipping seed.');
    }

    console.log('Seed complete.');
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('no such table')
    ) {
      console.error(
        'Tables do not exist. Run `npm run db:push` first to create the schema.'
      );
      process.exit(1);
    }
    throw error;
  }
}

seed();
