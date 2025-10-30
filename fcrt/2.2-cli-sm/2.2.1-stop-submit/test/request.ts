import { IStops } from "db/interfaces/stops";

//-- Test 1: submit stop loss order request without tpsl --//
export const req_fcrt_1a: Partial<IStops> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "buy",
  stop_type: "sl",
  size: 100,
  trigger_price: 2.85,
  order_price: 2.875,
  reduce_only: false,
  broker_id: undefined,
  memo: "[Info] Stop.Publish: Stop request does not exist; proceeding with submission",
};
