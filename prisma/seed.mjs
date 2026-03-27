import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sampleInstanceSlug = 'sample';
const testDeploymentSuperAdmin = 'fabian.boni@jsd.bs.ch';

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

  await prisma.superAdmin.upsert({
    where: { normalizedUsername: testDeploymentSuperAdmin },
    update: {
      username: testDeploymentSuperAdmin,
      normalizedUsername: testDeploymentSuperAdmin,
      isActive: true,
      note: 'Test deployment seed default',
    },
    create: {
      username: testDeploymentSuperAdmin,
      normalizedUsername: testDeploymentSuperAdmin,
      isActive: true,
      note: 'Test deployment seed default',
    },
  });

  console.log(`Seeded sample roadmap instance: ${sampleInstanceSlug}`);
  console.log(`Seeded test deployment superadmin: ${testDeploymentSuperAdmin}`);
}

main()
  .catch((error) => {
    console.error('Prisma seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
