import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

class MyProcess {
    private process;
    public eventEmitter = new EventEmitter();

    constructor() {
        // Path to the script to be executed in the child process
        const scriptPath = path.join(__dirname, 'child-process-script.js');

        this.process = spawn('node', [scriptPath], {
            detached: true, // Run the process in a new process group
            stdio: 'ignore' // Detach stdio streams from the parent process
        });

        this.process.unref(); // Allow the parent process to exit independently

        // Setup event listeners for the child process (example)
        this.process.on('exit', (code) => {
            this.eventEmitter.emit('processExit', code);
        });
    }

    // Method to send data to the child process (example)
    sendMessage(message: any) {
        // Since stdio is ignored, use other communication methods like IPC if needed
        // For example, you can use files, databases, or network sockets
        // to communicate between the processes.
        console.log(`Message sent: ${message}`);
    }
}

// In child-process-script.js
process.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
});