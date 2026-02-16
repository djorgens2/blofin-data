// client.js
import type { IKeyProps, IResponseProps } from "../../lib/crypto.util";
import type { wsStatus } from "../../module/websocket";
import type {  signMessage  } "../../lib/crypto.util";
import type {  parseJSON  } "../../lib/std.util";

interface IAccount {
  data: {
    ts: number;
    totalEquity: number; //--float
    isolatedEquity: number; //--float
    details: [
      {
        currency: string; //--account currecy
        equity:  number; //--float
        available:  number; //--float
        balance:  number; //--float
        ts: number;
        isolatedEquity:  number; //--float
        equityUsd:  number; //--float
        availableEquity:  number; //--float
        frozen:  number; //--float
        orderFrozen:  number; //--float
        unrealizedPnl:  number; //--float
        isolatedUnrealizedPnl:  number; //--float
        coinUsdPrice:  number; //--float
        marginRatio:  number; //--float
        spotAvailable:  number; //--float
        liability:  number; //--float
        borrowFrozen:  number; //--float
      },
    ],
  },
}

const ws = new WebSocket("wss://openapi.blofin.com/ws/private");
let state: wsStatus = "connecting";

ws.onopen = () => {
  console.log("Connected to server");
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
  // ws.send(
  //   JSON.stringify({
  //     op: "subscribe",
  //     args: [{ channel: "candle15m", instId: "XRP-USDT" }],
  //   })
  // );
};

ws.onmessage = (message: any) => {
  const msg:any = parseJSON<IResponseProps>(message.data);
  console.log("WS Message:", msg);

  if (msg.event === "login") {
    if (msg.code) {
      ws.send(
        JSON.stringify({
          op: "subscribe",
          args: [{ channel: "account" }],
        })
      );
      state = "connected";
    } else state = "error";
  } else {
    // switch (message!.arg!.channel) {
    //   case "account": {
  }
};

ws.onclose = () => {
  console.log("Disconnected from server");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

setInterval(()=> {
  ws.send('ping');
},29000);

const data = {
  arg: { channel: "account" },
  data: {
    ts: "1746470353659",
    totalEquity: "4927.533672655394388412425936",
    isolatedEquity: "0",
    details: [
      {
        currency: "USDT",
        equity: "4928.203908386935011574",
        available: "4928.203908386935011574",
        balance: "4928.203908386935011574",
        ts: "1746154533175",
        isolatedEquity: "0",
        equityUsd: "4927.533672655394388412425936",
        availableEquity: "4928.203908386935011574",
        frozen: "0",
        orderFrozen: "0",
        unrealizedPnl: "0",
        isolatedUnrealizedPnl: "0",
        coinUsdPrice: "0.999864",
        marginRatio: "",
        spotAvailable: "",
        liability: "",
        borrowFrozen: "",
      },
    ],
  },
};
