import { cleanDatabase } from "../../api/test/prisma-test-helper";

async function globalTeardown() {
  console.log("Cleaning up test database...");
  await cleanDatabase();
}

export default globalTeardown;
