import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targets = ['onprem', 'ntlm', 'online'];

  const before = await prisma.roadmapInstance.groupBy({
    by: ['sharePointStrategy'],
    _count: { _all: true },
  });

  const result = await prisma.roadmapInstance.updateMany({
    where: {
      sharePointStrategy: { in: targets },
    },
    data: {
      sharePointStrategy: 'kerberos',
    },
  });

  const after = await prisma.roadmapInstance.groupBy({
    by: ['sharePointStrategy'],
    _count: { _all: true },
  });

  // eslint-disable-next-line no-console
  console.log('[migrate-instances-to-kerberos] updated', result.count, 'instance(s)');
  // eslint-disable-next-line no-console
  console.log('[migrate-instances-to-kerberos] before', before);
  // eslint-disable-next-line no-console
  console.log('[migrate-instances-to-kerberos] after', after);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[migrate-instances-to-kerberos] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
