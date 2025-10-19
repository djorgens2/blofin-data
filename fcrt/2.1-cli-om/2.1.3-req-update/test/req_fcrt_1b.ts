import { IRequest } from "db/interfaces/request";
import { setExpiry } from "lib/std.util";

//-- Test 1a: request reject on size, resub, then edit and resub
export const req_fcrt_1b: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.85,
  size: 1000,
  leverage: 50,
  expiry_time: setExpiry("8h"),
};
