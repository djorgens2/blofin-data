import { IStops } from "db/interfaces/stops";

//-- Test 2a: submit stop loss request without order --//
export const req_fcrt_2a: Partial<IStops> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "buy",
  stop_type: "sl",
  size: 100,
  trigger_price: 2.85,
  order_price: 2.875,
  reduce_only: false,
  broker_id: undefined,
  memo: "Test 2a: submit stop loss request without order",
};
