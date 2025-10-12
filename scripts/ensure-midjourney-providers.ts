/**
 * Ensure Tuzi Midjourney providers exist in the database.
 *
 * Usage:
 *    npx tsx scripts/ensure-midjourney-providers.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROVIDERS = [
  {
    id: 'tuzi-midjourney-imagine-001',
    name: 'Tuzi Midjourney Imagine',
    modelIdentifier: 'mj_relax_imagine',
    adapterName: 'TuziMidjourneyImagineAdapter',
    type: 'image',
    provider: 'TuZi',
    apiEndpoint: 'https://api.tu-zi.com',
    apiFlavor: 'custom',
    s3PathPrefix: 'midjourney-images',
  },
  {
    id: 'tuzi-midjourney-video-001',
    name: 'Tuzi Midjourney Video',
    modelIdentifier: 'mj_relax_video',
    adapterName: 'TuziMidjourneyVideoAdapter',
    type: 'video',
    provider: 'TuZi',
    apiEndpoint: 'https://api.tu-zi.com',
    apiFlavor: 'custom',
    s3PathPrefix: 'midjourney-videos',
  },
]

async function main() {
  for (const provider of PROVIDERS) {
    await prisma.apiProvider.upsert({
      where: { id: provider.id },
      update: {
        name: provider.name,
        modelIdentifier: provider.modelIdentifier,
        adapterName: provider.adapterName,
        type: provider.type,
        provider: provider.provider,
        apiEndpoint: provider.apiEndpoint,
        apiFlavor: provider.apiFlavor,
        s3PathPrefix: provider.s3PathPrefix,
        isActive: true,
      },
      create: {
        ...provider,
        encryptedAuthKey: null,
        isActive: true,
        uploadToS3: false,
      },
    })
    console.log(`✅ Upserted provider ${provider.name}`)
  }
}

main()
  .catch((error) => {
    console.error('Failed to upsert Midjourney providers', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
