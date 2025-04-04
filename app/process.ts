//+--------------------------------------------------------------------------------------+
//|                                                                           process.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
import type { IMessage } from "@lib/std.util";

import { parse, hex } from "@lib/std.util";

import * as CandleAPI from "@api/candles";
import * as Candle from "@db/interfaces/candle";
import * as Instrument from "@db/interfaces/instrument";

//+--------------------------------------------------------------------------------------+
//| CProcess - Master Processing Instantiator/Monitor Class for Enabled Instruments;     |
//+--------------------------------------------------------------------------------------+
class CProcess {
  private ipc: IMessage = { state: "", symbol: "", node: 0 };
  private props: Candle.IKeyProps = { instrument: hex(0x0, 3), symbol: "", period: hex(0x0, 3), timeframe: "" };

  constructor() {
    const [cli_message] = process.argv.slice(2);
    const parsed = parse<IMessage>(cli_message);

    this.ipc = { ...parsed, state: "init", symbol: parsed!.symbol, node: parsed!.node };

    process.on("message", (message: IMessage) => {
      if (message.state === "api") {
        //        Candles.Fetch(this.props, { ...message, state: "api" });
        process.send && process.send({ ...message, state: "api" });
      }
    });

    process.on("exit", (code) => {
      console.log(`3:[symbol] Symbol process PID: ${process.pid} exited with code ${code}`);
    });

    this.Initialize();

    console.log(`1:[symbol] Symbol process PID: ${process.pid}`, this.ipc);
    process.send && process.send(this.ipc);
  }

  async Initialize() {
    //---- initialization ----//
    const [instrument]: Array<Partial<Instrument.IInstrument>> = await Instrument.Fetch({ symbol: this.ipc.symbol });

    //    console.log(this.ipc, instrument)
    Object.assign(this.props, { instrument: instrument.instrument, symbol: instrument.symbol, period: instrument.trade_period, timeframe: instrument.trade_timeframe });
    console.log(this.props);

    this.ipc = { ...this.ipc, state: "ready" };
    console.log(`2:[symbol] Symbol process PID: ${process.pid}`, this.ipc);
    process.send && process.send({ ...this.ipc, state: "ready" });

    //    Candles.Fetch(this.props, this.ipc);
  }
}

const symbol = new CProcess();
