import { IRequest } from "@db/interfaces/request";

//-- Test 1: request w/o expiry; w/o tpsl
export const req_fcrt_1a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.95,
  leverage: 50,
  size: 100,
};
