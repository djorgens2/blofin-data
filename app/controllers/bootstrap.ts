import { spawn } from 'child_process';
import { UserToken, setUserToken } from '#module/auth';
import { routeLogs } from '#lib/log.util';

async function bootstrap() {
  // 1. Check if we are already 'The Daemon'
  if (process.env.IS_DAEMON === 'true') {
    // This is the background process. Continue with app logic.
    return startPapaHub();
  }

  // 2. Initial interactive setup (Take stdin credentials)
  const credentials = await promptForCredentials(); 
  const token = await verify(credentials);

  if (token.isAdmin()) {
    console.log("[Success] Authority verified. Dropping to background...");

    // 3. Spawn a detached clone of the current process
    const daemon = spawn(process.argv[0], process.argv.slice(1), {
      detached: true,
      stdio: 'ignore', // Disconnect from current terminal entirely
      env: { 
        ...process.env, 
        IS_DAEMON: 'true',
        SESSION_TOKEN: JSON.stringify(token) // Pass the verified token to the clone
      }
    });

    // 4. Unref so Papa doesn't wait for the clone to finish
    daemon.unref();

    // 5. Exit the foreground process to free the terminal
    process.exit(0);
  }
}
