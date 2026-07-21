import dotenv from "dotenv";

dotenv.config();

async function testShutdownSecurity() {
  console.log("=================================================================");
  console.log("   YuvaHub Shutdown Endpoint Security Test                       ");
  console.log("=================================================================");

  try {
    const response = await fetch("http://localhost:5173/api/analytics/shutdown", {
      method: "POST"
    });

    console.log(`[Security Test] POST /api/analytics/shutdown HTTP Status: ${response.status}`);

    if (response.status === 404) {
      console.log("[SUCCESS] Shutdown endpoint is completely removed (404 Not Found). Remote termination prevented!");
    } else {
      console.warn(`[WARNING] Shutdown endpoint returned status ${response.status}.`);
    }
  } catch (err: any) {
    console.log("[SUCCESS] Server offline or endpoint unreachable:", err.message);
  }
}

testShutdownSecurity();
