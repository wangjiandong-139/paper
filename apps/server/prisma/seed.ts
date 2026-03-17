import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  const user = await prisma.user.upsert({
    where: { wechat_open_id: 'local:user' },
    create: {
      wechat_open_id: 'local:user',
      nickname: '初始用户',
      onboarding_completed: true,
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash('1', BCRYPT_ROUNDS);
  await prisma.localCredential.upsert({
    where: { username: 'user' },
    create: {
      user_id: user.id,
      username: 'user',
      password_hash: passwordHash,
    },
    update: { password_hash: passwordHash },
  });

  console.log('Seed: initial user (user/1) created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
