import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = await bcrypt.hash('Passw0rd!', 12);

  const company = await prisma.company.upsert({
    where: { slug: 'adriatic' },
    update: {},
    create: { name: 'Adriatic Real Estate', slug: 'adriatic', currency: 'EUR', locale: 'EN' },
  });

  const budva = await prisma.branch.create({ data: { companyId: company.id, name: 'Budva HQ', region: 'BUDVA' } });
  const kotor = await prisma.branch.create({ data: { companyId: company.id, name: 'Kotor Office', region: 'KOTOR' } });

  const mkUser = (email: string, fullName: string, roles: string[], branchId?: string) =>
    prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email } },
      update: {},
      create: { companyId: company.id, branchId, email, passwordHash: password, fullName, roles: roles as any },
    });

  await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'superadmin@reos.dev' } },
    update: {},
    create: { companyId: company.id, email: 'superadmin@reos.dev', passwordHash: password, fullName: 'Platform Admin', roles: ['SUPER_ADMIN'] as any },
  });
  const owner = await mkUser('owner@adriatic.me', 'Marko Petrović', ['COMPANY_OWNER']);
  await mkUser('manager@adriatic.me', 'Jelena Vuković', ['BRANCH_MANAGER'], budva.id);
  const agent = await mkUser('agent@adriatic.me', 'Nikola Đukanović', ['SALES_AGENT'], budva.id);
  const caller = await mkUser('callcenter@adriatic.me', 'Ana Radović', ['CALL_CENTER_AGENT'], budva.id);
  await mkUser('content@adriatic.me', 'Stefan Kovač', ['CONTENT_MANAGER']);
  await mkUser('finance@adriatic.me', 'Milica Lazić', ['FINANCE_OFFICER']);

  // Leads
  const sources = ['FACEBOOK', 'INSTAGRAM', 'TELEGRAM', 'PORTAL', 'REFERRAL'] as const;
  const regions = ['BUDVA', 'KOTOR', 'TIVAT', 'BAR'] as const;
  for (let i = 0; i < 40; i++) {
    await prisma.lead.create({
      data: {
        companyId: company.id,
        branchId: budva.id,
        kind: i % 3 === 0 ? 'OWNER' : 'BUYER',
        fullName: `Lead ${i + 1}`,
        phone: `+3826${String(70000000 + i).slice(0, 7)}`,
        email: i % 2 === 0 ? `lead${i}@example.com` : null,
        source: sources[i % sources.length],
        region: regions[i % regions.length],
        score: 40 + ((i * 7) % 60),
        assignedToId: i % 2 === 0 ? agent.id : caller.id,
        status: (['NEW', 'TO_CALL', 'CALLING', 'FOLLOW_UP', 'POTENTIAL'] as const)[i % 5],
      },
    });
  }

  // Properties
  const types = ['APARTMENT', 'VILLA', 'HOUSE', 'COMMERCIAL'] as const;
  const rooms = ['1+1', '2+1', '3+1', '4+1'];
  for (let i = 0; i < 24; i++) {
    const region = regions[i % regions.length];
    const property = await prisma.property.create({
      data: {
        companyId: company.id,
        branchId: i % 2 === 0 ? budva.id : kotor.id,
        reference: `${region.slice(0, 3)}-${1000 + i}`,
        title: `${types[i % types.length]} in ${region}`,
        type: types[i % types.length],
        purpose: i % 4 === 0 ? 'RENT' : 'SALE',
        status: i % 5 === 0 ? 'SOLD' : 'ACTIVE_LISTING',
        region,
        address: `Street ${i + 1}, ${region}`,
        latitude: 42.28 + (i % 10) * 0.01,
        longitude: 18.84 + (i % 10) * 0.01,
        price: 90000 + i * 15000,
        rooms: rooms[i % rooms.length],
        sizeM2: 45 + i * 5,
        ownerName: `Owner ${i + 1}`,
        ownerPhone: `+3826${String(80000000 + i).slice(0, 7)}`,
        publishedAt: new Date(),
        media: { create: [{ companyId: company.id, type: 'PHOTO', url: `https://picsum.photos/seed/reos${i}/800/600`, isCover: true, position: 0 }] },
      },
    });
    if (i % 5 === 0) {
      await prisma.deal.create({
        data: { companyId: company.id, branchId: budva.id, title: `Deal ${property.reference}`, stage: 'DEAL_CLOSED', value: Number(property.price), probability: 100, propertyId: property.id, ownerId: agent.id, closedAt: new Date() },
      });
    }
  }

  // Customers
  for (let i = 0; i < 30; i++) {
    await prisma.customer.create({
      data: {
        companyId: company.id,
        branchId: budva.id,
        fullName: `Customer ${i + 1}`,
        phone: `+3826${String(90000000 + i).slice(0, 7)}`,
        kind: i % 5 === 0 ? 'TENANT' : 'BUYER',
        intent: i % 2 === 0 ? 'INVESTMENT' : 'LIVING',
        segment: (['HOT', 'WARM', 'COLD'] as const)[i % 3],
        budgetMin: 80000 + i * 5000,
        budgetMax: 200000 + i * 10000,
        preferredRegions: [regions[i % regions.length]] as any,
        propertyType: types[i % types.length] as any,
        roomRequirement: rooms[i % rooms.length],
        assignedToId: agent.id,
      },
    });
  }

  // Message template
  await prisma.messageTemplate.create({
    data: { companyId: company.id, name: 'New listings (EN)', channel: 'WHATSAPP', body: 'Hi {{name}}, we found new properties matching your criteria. Take a look!' },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded company ${company.name} with users, leads, properties, customers. Owner: ${owner.email}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
