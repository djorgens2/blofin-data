import { IRequest } from "@db/interfaces/request";
import { setExpiry } from "@lib/std.util";

//-- Test 1: request w/o expiry; w/o tpsl
export const req_fcrt_1a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 3.5,
  size: 100,
  leverage: 50,
  memo: "Test 2: request w/ expiry; w/o tpsl",
  expiry_time: setExpiry("2m"),
};
