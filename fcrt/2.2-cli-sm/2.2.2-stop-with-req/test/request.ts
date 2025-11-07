import { IRequest } from "db/interfaces/request";

//-- Test 2a: request w/o expiry; w/o tpsl
export const req_fcrt_2a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.95,
  leverage: 50,
  size: 100,
};
