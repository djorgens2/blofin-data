//+---------------------------------------------------------------------------------------+
//|                                                                          positions.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Modify, parseColumns, Select } from "@db/query.utils";
import * as States from "@db/interfaces/state";

export interface IPositions {
  position_id: Uint8Array;
  position: "short" | "long" | "net";
  positions: number;
  positions_avail: number;
  symbol: string;
  instrument: Uint8Array;
  instrument_type: Uint8Array;
  action: "buy" | "sell";
  counteraction: "buy" | "sell";
  leverage: number;
  digits: number;
  margin_mode: "cross" | "isolated";
  margin_used: number;
  margin_ratio: number;
  margin_initial: number;
  margin_maint: number;
  average_price: number;
  liquidation_price: number;
  mark_price: number;
  unrealized_pnl: number;
  unrealized_pnl_ratio: number;
  adl: number;
  state: Uint8Array;
  create_time: Date | number;
  update_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IPositions>): Promise<IPositions["position_id"] | undefined> {
  const fulfilled = await States.Key({ status: "Fulfilled" });
  const { position_id, state, create_time, update_time, ...publish } = props;
  const [fields, args] = parseColumns({ ...publish }, "");
  const sql =
    `INSERT INTO blofin.positions (${fields.join(", ")}, position_id, state, create_time, update_time) VALUES (${Array(args.length)
      .fill("?")
      .join(", ")}, ?, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000)) ` +
    `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")}= ?, state = ?, create_time = FROM_UNIXTIME(?/1000), update_time = FROM_UNIXTIME(?/1000)`;

  try {
    await Modify(sql, [...args, position_id, fulfilled, create_time, update_time, ...args, fulfilled, create_time, update_time]);
    return position_id;
  } catch (e) {
    console.log({ sql, fields, args, publish });
    console.log(e);
  }
}

//+--------------------------------------------------------------------------------------+
//| Sets the state of the position; closes all inactive (closed, missing) positions;     |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Array<Partial<IPositions>>) {
  const fulfilled = await Select<IPositions>(`SELECT * FROM blofin.vw_positions WHERE status = "Fulfilled"`, []);
  const closed = await States.Key({ status: "Closed" });

  for (const id in fulfilled) {
    const update = fulfilled[id];
    const active = props.find(({ position_id }) => position_id?.toString() === update.position_id?.toString());

    try {
      if (!active) {
        await Modify(`UPDATE blofin.positions set state = ? WHERE position_id = ?`, [closed, update.position_id]);
      }
    } catch (e) {
      console.log({
        sql: `UPDATE blofin.positions set state = ? WHERE position_id = ?`,
        fields: ["state", "position_id"],
        args: [closed, update.position_id],
      });
      console.log(e);
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IPositions>): Promise<Array<Partial<IPositions>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_positions ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IPositions>(sql, args);
}
