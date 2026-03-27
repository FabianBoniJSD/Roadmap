import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sampleInstanceSlug = 'sample';

const sampleSettings = {
  features: {
    sampleData: true,
  },
  metadata: {
    sampleData: true,
    seededBy: 'prisma/seed.mjs',
  },
};

async function main() {
  await prisma.roadmapInstance.upsert({
    where: { slug: sampleInstanceSlug },
    update: {
      displayName: 'Sample Roadmap',
      description: 'Lokale Demo-Instanz mit Beispielprojekten für das Testdeployment.',
      sharePointSiteUrlDev: 'https://example.invalid/sites/roadmap-sample',
      sharePointSiteUrlProd: 'https://example.invalid/sites/roadmap-sample',
      sharePointStrategy: 'kerberos',
      spUsername: '',
      spPassword: '',
      allowSelfSigned: false,
      deploymentEnv: 'development',
      defaultLocale: 'de-CH',
      defaultTimeZone: 'Europe/Zurich',
      landingPage: 'sample',
      settingsJson: JSON.stringify(sampleSettings),
    },
    create: {
      slug: sampleInstanceSlug,
      displayName: 'Sample Roadmap',
      description: 'Lokale Demo-Instanz mit Beispielprojekten für das Testdeployment.',
      sharePointSiteUrlDev: 'https://example.invalid/sites/roadmap-sample',
      sharePointSiteUrlProd: 'https://example.invalid/sites/roadmap-sample',
      sharePointStrategy: 'kerberos',
      spUsername: '',
      spPassword: '',
      allowSelfSigned: false,
      deploymentEnv: 'development',
      defaultLocale: 'de-CH',
      defaultTimeZone: 'Europe/Zurich',
      landingPage: 'sample',
      settingsJson: JSON.stringify(sampleSettings),
    },
  });

  console.log(`Seeded sample roadmap instance: ${sampleInstanceSlug}`);
}

main()
  .catch((error) => {
    console.error('Prisma seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
