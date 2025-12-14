import { IRequest } from "db/interfaces/request";
import { setExpiry } from "lib/std.util";

//-- Test 2a: submit request with '1d' expiry; with new leverage
export const req_fcrt_2a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.55,
  leverage: 50,
  size: 500,
  memo: "Test 2a: submit request with '1d' expiry; with new leverage",
  expiry_time: setExpiry(`1d`)
};

//-- Test 3a: update request with '5m' expiry; without tpsl
export const req_fcrt_3a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  price: 2.95,
  size: 100,
  expiry_time: setExpiry(`5m`), // 5 minutes from now
  memo: "Test 3a: submit request with '5m' expiry; without tpsl",
};
