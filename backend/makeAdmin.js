require("dotenv").config({ quiet: true });
const prisma = require("./src/db/prisma");

const [, , email, role, category] = process.argv;

(async () => {
  const user = await prisma.user.update({
    where: { email },
    data: { role, category: category || null },
  });
  console.log("Done:", { id: user.id, email: user.email, role: user.role, category: user.category });
  await prisma.$disconnect();
})();