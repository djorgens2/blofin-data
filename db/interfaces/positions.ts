//+---------------------------------------------------------------------------------------+
//|                                                                          positions.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import { Modify, parseColumns, Select } from "@db/query.utils";

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
  margin_ratio: number;
  margin_initial: number;
  margin_maint: number;
  average_price: number;
  liquidation_price: number;
  mark_price: number;
  unrealized_pnl: number;
  unrealized_pnl_ratio: number;
  adl: number;
  create_time: Date | number;
  update_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IPositions>): Promise<IPositions["position_id"] | undefined> {
  const { position_id, create_time, update_time, ...publish } = props;
  const [fields, args] = parseColumns({ ...publish }, "");
  const sql =
    `INSERT INTO blofin.positions (${fields.join(", ")}, position_id, create_time, update_time) VALUES (${Array(args.length)
      .fill("?")
      .join(", ")}, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000)) ` +
    `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")} = ?, create_time = FROM_UNIXTIME(?/1000), update_time = FROM_UNIXTIME(?/1000)`;

  try {
    await Modify(sql, [...args, position_id, create_time, update_time, ...args, create_time, update_time]);
    return position_id;
  } catch (e) {
    console.log({ sql, fields, args });
    console.log(e);
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
