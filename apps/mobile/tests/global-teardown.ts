import { cleanDatabase } from "../../api/test/prisma-test-helper";
import { stopMockServer } from "./mock-association-api";

async function globalTeardown() {
  console.log("Cleaning up test database...");
  await cleanDatabase();
  console.log("Stopping mock association API server...");
  await stopMockServer();
}

export default globalTeardown;
