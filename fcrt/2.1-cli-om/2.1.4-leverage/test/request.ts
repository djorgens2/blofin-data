import type { IRequest } from "#db/interfaces/request";
import { setExpiry } from "#lib/std.util";

//-- Test 2a: submit request with '1d' expiry; with new leverage
export const req_fcrt_2a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 2.5,
  leverage: 15,
  size: 500,
  memo: "Test 2a: submit request with '1d' expiry; with new leverage",
  expiry_time: setExpiry(`1d`)
};

//-- Test 2b: merge request with revised leverage
export const req_fcrt_2b: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  leverage: 50,
  memo: "Test 2b: update pending order with revised leverage (live app)",
};

//-- Test 2c: merge request with revised leverage
export const req_fcrt_2c: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  leverage: 40,
  memo: "Test 2c: update pending order with revised leverage (quiesced app)",
};
