import { IRequest } from "db/interfaces/request";
import { setExpiry } from "lib/std.util";

//-- Test 1: request w/o expiry; w/o tpsl
export const req_fcrt_1a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.85,
  size: 100,
  expiry_time: setExpiry("5m"),
};
