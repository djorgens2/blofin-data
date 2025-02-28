interface IPoint {
  time: number;
  price: number;
}

interface IFractal {
  Origin: IPoint;
  Base: IPoint;
  Root: IPoint;
  Expansion: IPoint;
  Retrace: IPoint;
  Recovery: IPoint;
  Close: IPoint;
}
  // Fractal = {
  //   time: 0,
  //   direction: Direction.None,
  //   lead: Bias.None,
  //   bias: Bias.None,
  //   point: {
  //     Origin: initPoint,
  //     Base: initPoint,
  //     Root: initPoint,
  //     Expansion: initPoint,
  //     Retrace: initPoint,
  //     Recovery: initPoint,
  //     Close: initPoint,
  //   },
  //   state: FractalState.Breakout,
  // };

const sma: {
  open: number,
  close: number, 
} = {open: 0, close: 0};

function set(props: {open:number, close:number}) {
  sma.open += props.open;
  sma.close += props.close;
}

set({open: 1, close:-6});
set({open: 2, close:-5});
set({open: 3, close:-4});
set({open: 4, close:-3});
set({open: 5, close:-2});
set({open: 6, close:-1});

console.log(sma);
/*
const point:IPoint = {time: 0, price: 0};
const fractal:IFractal = {
  Origin: point,
  Base: point,
  Root: point,
  Expansion: point,
  Retrace: point,
  Recovery: point,
  Close: point,
};

console.log("f:",fractal);
let temp = fractal;

console.log("f:",fractal);
console.log("tmp:",temp);

temp.Origin.price = 1.34;
temp.Close.price = 0.78;

console.log("f:",fractal);
console.log("tmp:",temp);

temp = fractal;
console.log("tmp:",temp);

temp.Origin = { time: 0, price: 1.45 };
temp.Expansion = { time: -1, price: 1.82 };

console.log("tmp:",temp);

fractal.Origin.time=0;
fractal.Origin.price=0;

console.log("f:", fractal)
*/