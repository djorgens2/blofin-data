import { IRequest } from "db/interfaces/request";

//-- Test 2a: request w/o expiry; w/o tpsl
export const req_fcrt_2a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.95,
  size: 100,
};

//-- Test 3a: request w/o expiry; cancel test
export const req_fcrt_3a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
};
