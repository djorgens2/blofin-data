import { Select, Modify } from "../query.utils";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface IInstrumentDetail extends RowDataPacket {
  instrument: number;
  instrument_type: number;
  contract_type: number;
  contract_value: number;
  max_leverage: number;
  min_size: number;
  lot_size: number;
  tick_size: number;
  max_limit_size: number;
  max_market_size: number;
  list_time: number;
  expiry_time: number;
}

export async function Publish(
  Instrument: number,
  Type: number,
  Contract: number,
  Value: number,
  MaxLeverage: number,
  MinSize: number,
  LotSize: number,
  TickSize: number,
  MaxLimitSize: number,
  MaxMarketSize: number,
  ListTime: number,
  Expiry: number
): Promise<number> {
  const set = await Modify(
    `REPLACE INTO instrument_detail SET instrument = ?, instrument_type = ?, contract_type = ?, contract_value = ?, max_leverage = ?, min_size = ?, lot_size = ?,
        tick_size = ?, max_limit_size = ?, max_market_size = ?, list_time = FROM_UNIXTIME(?/1000), expiry_time = FROM_UNIXTIME(?/1000)`,
    [
      Instrument,
      Type,
      Contract,
      Value,
      MaxLeverage,
      MinSize,
      LotSize,
      TickSize,
      MaxLimitSize,
      MaxMarketSize,
      ListTime,
      Expiry,
    ]
  );

  return set.insertId;
}
