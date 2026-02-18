import type { IRequest } from "db/interfaces/request";
import { setExpiry } from "lib/std.util";

//-- Test 1a: request reject on size, resub, then edit and resub
export const req_fcrt_1a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 1.65,
  size: 100000,
  leverage: 50,
  expiry_time: setExpiry("8h"),
  memo: 'Test 1a: request reject on size, resub, then edit and resub'
};

//-- Test 1b: request reject on size, resub, then edit and resub
export const req_fcrt_1b: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 1.85,
  size: 1000,
  leverage: 50,
  expiry_time: setExpiry("8h"),
  memo: 'Test 1b: request reject on size, resub, then edit and resub'
};

//-- Test 1c: request reject on size, resub, then edit and resub
export const req_fcrt_1c: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 1.55,
  size: 100,
  leverage: 25,
  expiry_time: setExpiry("1h"),
  memo: 'Test 1c: request reject on size, resub, then edit and resub'
};

//-- Test 1d: request reject on size, resub, then edit and resub
export const req_fcrt_1d: Partial<IRequest> = {
  symbol: "XRP-USDT",
  position: "short",
  expiry_time: setExpiry("1m"),
  memo: 'Test 1d: request reject on size, resub, then edit and resub'
};
