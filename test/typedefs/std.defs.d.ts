"use strict"

declare const NoValue: number = -1;

declare enum Direction {
  None,
  Up,
  Down,
  Flat,
};

declare enum Action {
  None,
  Buy,
  Sell,
  Wait,
};

declare const dir: typeof Direction;
declare const op: typeof Action;
