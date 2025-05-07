import { parseJSON } from "@/lib/std.util";
import { IResponseProps, signMessage } from "@lib/crypto.util";

export const wsStatus = {
  connected: "connected",
  disconnected: "diconnected",
  connecting: "connecting",
  error: "error",
  closed: "closed",
} as const;
export type wsStatus = (typeof wsStatus)[keyof typeof wsStatus];

let state: wsStatus = "closed";

export function openWebSocket(url: string) {
  const ws = new WebSocket(url);

  ws.onopen = () => {
    const login = async () => {
      const [apiKey, passphrase, sign, timestamp, nonce] = await signMessage({ method: "GET", path: "/users/self/verify" });
      ws.send(
        JSON.stringify({
          op: "login",
          args: [{ apiKey, passphrase, timestamp, sign, nonce }],
        })
      );
    };

    login();
  };

  ws.onclose = () => {
    state = "closed";
  };

  ws.onerror = (error) => {
    state = "error";
    console.error("WebSocket error:", error);
  };

  ws.onmessage = (event) => {
    const message = parseJSON<IResponseProps>(event.data);
    console.log(message);
    //    if (event.type === 'message') return;
    if (message!.event === "pong") {
      state = "connected";
    } else if (message!.event === "login") {
      if (message!.code === "0") {
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [{ channel: "account" }],
          })
        );
        state = "connected";
      } else state = "error";
    } else if (message!.arg!.channel! !== undefined)
      switch (message!.arg!.channel) {
        case "account": {
          console.log("In message:", message);
        }
      }
  };

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 29000);
  return ws;
}
