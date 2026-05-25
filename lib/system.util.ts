import { execSync } from "child_process";

/**
 * @function getProcessStartTime
 * @description Gets the exact start time of a PID to prevent "PID Recycling" collisions.
 */
export const getProcessStartTime = (pid: number): number => {
  try {
    // Returns the exact start time string from the OS
    return new Date(execSync(`ps -p ${pid} -o lstart=`).toString().trim()).getTime();
  } catch {
    return 0;
  }
};

export const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0); // "Lock and Load"
    return true; // It's alive! Block the new launch.
  } catch (err: any) {
    // ESRCH means the PID is not found in the OS table
    return err.code === "EPERM"; // If EPERM, it's alive but restricted.
  }
};

export const confirmProcess = (pid: number, processName: string, processTime: number): boolean => {
  try {
    // Find the process start time by pid
    const pTime = isProcessAlive(pid) ? getProcessStartTime(pid) : null;

    if (!pTime || pTime !== processTime) return false;

    // Returns the full command used to start the process
    const pName = execSync(`ps -p ${pid} -o command=`).toString().trim();

    // Check if the command contains your specific file path or "Papa" marker
    return processName.includes(pName);
  } catch {
    return false; // Process doesn't exist
  }
};
