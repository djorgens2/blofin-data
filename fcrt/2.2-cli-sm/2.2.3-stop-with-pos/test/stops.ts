import { IStops } from "db/interfaces/stops";
import { hexify } from "lib/crypto.util";

//-- Test 2b: submit stop loss with position --//
export const req_fcrt_2b: Array<Partial<IStops>> = [
  {
    symbol: "XRP-USDT",
    position: "long",
    action: "sell",
    stop_type: "tp",
    size: 500,
    trigger_price: 2.5800,
    order_price: 2.58500,
    reduce_only: true,
    memo: "Test 2b: submit take profit with position",
  },
  {
    symbol: "XRP-USDT",
    position: "long",
    action: "sell",
    stop_type: "sl",
    size: 500,
    trigger_price: 2.3180,
    order_price: 2.3220,
    reduce_only: true,
    memo: "Test 2b: submit stop loss with position",
  },
];

//-- Test 3b: submit updates to queued stop requests--//
export const req_fcrt_3b: Array<Partial<IStops>> = [
  {
    symbol: "XRP-USDT",
    position: "short",
    stop_type: "tp",
    size: 100,
    trigger_price: 3.05,
    order_price: 3.15,
    memo: "Test 3b: submit update to take profit request",
  },
  {
    symbol: "XRP-USDT",
    position: "short",
    stop_type: "sl",
    size: 100,
    trigger_price: 1.95,
    order_price: 1.975,
    reduce_only: true,
    memo: "Test 3b: submit update to stop loss request",
  },
];
