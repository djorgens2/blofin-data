import { Direction, Bias } from "@lib/std.defs.d";

enum dir {up,down,left,right};

console.log(Object.keys(dir).length/2);

export const Role = {
    Unassigned: "Unassigned",
    Seller: "Seller",
    Buyer: "Buyer",
  } as const;

console.log(Object.keys(Direction).length)
