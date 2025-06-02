"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Child process (child.js)
process.on('message', message => {
    /*@ts-ignore */
    if (message.type === 'websocket-message') {
        /*@ts-ignore */
        // Process the message
        const response = `Processed: ${message.data}`;
        console.log('In Child from ws:', message);
        // Send a message back to the main process
        /*@ts-ignore */
        process.send({ type: 'child-message', data: response });
    }
});
