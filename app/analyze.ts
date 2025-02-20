import { Fetch } from "../db/interfaces/instrument";
import { CalculateFractal } from "./fractal"

export async function Analyze() {
  const pair = await Fetch();

  pair.forEach((item) => {
    if (item.is_trading) CalculateFractal(item);
  });
}
