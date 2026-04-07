import { startMockServer } from "./mock-association-api";

async function globalSetup() {
  console.log("Starting mock association API server...");
  await startMockServer();
}

export default globalSetup;
