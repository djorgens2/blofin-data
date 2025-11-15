import { IRequest } from "db/interfaces/request";
import { setExpiry } from "lib/std.util";

//-- Test 1c: request reject on size, resub, then edit and resub
export const req_fcrt_1c: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.55,
  size: 100,
  leverage: 50,
  status: "Hold",
  expiry_time: setExpiry("1h"),
};

//-- Test 1d: request reject on size, resub, then edit and resub
export const req_fcrt_1d: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  expiry_time: setExpiry("1m"),
};
