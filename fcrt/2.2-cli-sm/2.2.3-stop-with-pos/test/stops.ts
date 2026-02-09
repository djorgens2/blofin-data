import { IStopRequest } from "db/interfaces/stop_request";

//-- Test 2b: submit stop loss with position --//
export const req_fcrt_2b: Array<Partial<IStopRequest>> = [
  {
    symbol: "XRP-USDT",
    position: "long",
    action: "sell",
    stop_request_type: "tp",
    size: 500,
    trigger_price: 2.5800,
    order_price: 2.58500,
  },
  {
    symbol: "XRP-USDT",
    position: "long",
    action: "sell",
    stop_request_type: "sl",
    size: 500,
    trigger_price: 2.3180,
    order_price: 2.3220,
  },
];

//-- Test 3b: submit updates to queued stop requests--//
export const req_fcrt_3b: Array<Partial<IStopRequest>> = [
  {
    symbol: "XRP-USDT",
    position: "short",
    stop_request_type: "tp",
    size: 100,
    trigger_price: 3.05,
  },
  {
    symbol: "XRP-USDT",
    position: "short",
    stop_request_type: "sl",
    size: 100,
    trigger_price: 1.95,
    order_price: 1.975,
  },
];
