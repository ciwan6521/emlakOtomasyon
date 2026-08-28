#!/usr/bin/env node
/**
 * Creates (or resets the password of) a company owner without seeding demo data.
 *
 * Runs inside the api container, which already has the generated Prisma client:
 *   docker cp scripts/create-admin.js reos-api:/tmp/create-admin.js
 *   docker compose ... exec \
 *     -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='...' \
 *     api node /tmp/create-admin.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const email = required("ADMIN_EMAIL").toLowerCase();
  const password = required("ADMIN_PASSWORD");
  const fullName = process.env.ADMIN_NAME || "Administrator";
  const companyName = process.env.COMPANY_NAME || "Point Step Up";
  const companySlug = process.env.COMPANY_SLUG || "pointstepup";
  const locale = process.env.COMPANY_LOCALE || "ME";

  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: {},
      create: {
        name: companyName,
        slug: companySlug,
        currency: "EUR",
        locale,
      },
    });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email } },
      update: { passwordHash, isActive: true },
      create: {
        companyId: company.id,
        email,
        passwordHash,
        fullName,
        roles: ["COMPANY_OWNER"],
      },
    });

    console.log(`Company: ${company.name} (${company.slug})`);
    console.log(`Owner:   ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
