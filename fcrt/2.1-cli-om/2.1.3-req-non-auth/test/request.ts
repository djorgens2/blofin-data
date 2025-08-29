import { IRequest } from "@db/interfaces/request";
import { setExpiry } from "@lib/std.util";

//-- Test 1: request w/o expiry; w/o tpsl
export const req_fcrt_1a: Partial<IRequest> = {
  symbol: "VIRTUAL-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 3.5,
  size: 100,
  leverage: 50,
  expiry_time: setExpiry("30m"),
};
