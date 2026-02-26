/**
 * @file shutdown.ts
 * @summary Graceful Process Lifecycle Management
 */

import { isProcessing } from "../controller/worker"; // You'll need to export the flag

const handleShutdown = async (signal: string) => {
  console.log(`\n[System] Received ${signal}. Starting graceful shutdown...`);

  // 1. Wait for the 'Mutex' to clear
  let attempts = 0;
  while (isProcessing && attempts < 10) {
    console.log("[System] Trade cycle in progress... waiting...");
    await new Promise(resolve => setTimeout(resolve, 500)); 
    attempts++;
  }

  // 2. Perform cleanup
  console.log("[System] Closing connections and flushing logs.");
  
  // Optional: Send a 'logout' or 'unsubscribe' to the WSS if needed
  
  console.log("[System] Shutdown complete. Goodbye.");
  process.exit(0);
};

// Listen for termination signals
process.on("SIGINT", () => handleShutdown("SIGINT"));  // Ctrl+C
process.on("SIGTERM", () => handleShutdown("SIGTERM")); // Kill command
