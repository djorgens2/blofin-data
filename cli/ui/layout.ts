"use strict";

// import { red, green, cyan, yellow, bold, dim } from "console-log-colors";
import chalk from "chalk";

type TArea = { top: number; left: number; right: number; bottom: number };
type TSize = { min: number; max: number; scale: number };

interface IBody {
  margin: TArea;
}

interface IFrame {
  title: string;
  align: string;
  padding: TArea;
  height: TSize;
  width: TSize;
}

interface IField {
  name: string;
  label: string;
  value: string;
  length: number;
  protected?: string;
  position: {
    x: number;
    y: number;
  };
}
const frames: Array<IFrame> = [
  {
    title: "navBar",
    align: "top",
    padding: { top: 0, left: 5, right: 5, bottom: 0 },
    height: { min: 5, max: 8, scale: 0 },
    width: { min: 5, max: 0, scale: 100 },
  },
  {
    title: "sideBar",
    align: "left",
    padding: { top: 0, left: 5, right: 5, bottom: 0 },
    height: { min: 5, max: 0, scale: 100 },
    width: { min: 5, max: 0, scale: 100 },
  },
];

const fields: Array<IField> = [
  { name: "username", label: "User Name or E-Mail:  ", value: "", position: { x: 15, y: 5 }, length: 30 },
  { name: "password", label: "           Password:  ", value: "", position: { x: 15, y: 6 }, length: 30 },
];

const body: IBody = { margin: { top: 1, left: 5, right: 5, bottom: 1 } };

const renderLayout = async (Height: number, Width: number) => {
  console.clear();
  body.margin.top && process.stdout.write("\n".repeat(body.margin.top));
  process.stdout.write(" ".repeat(body.margin.left) + "╭" + "─".repeat(Width - (body.margin.left + body.margin.right + 2)) + "╮\n");
  process.stdout.write(
    (" ".repeat(body.margin.left) + "│" + " ".repeat(Width - (body.margin.left + body.margin.right + 2)) + "│\n").repeat(frames[0].height.max - 2),
  );
  process.stdout.write(" ".repeat(body.margin.left) + "╰" + "─".repeat(Width - (body.margin.left + body.margin.right + 2)) + "╯\n");

  process.stdout.cursorTo(fields[0].position.x, fields[0].position.y);
  process.stdout.write(fields[0].label);
  process.stdout.write(chalk.bgGray(" ".repeat(fields[0].length)));
  process.stdout.cursorTo(fields[0].position.x + fields[0].label.length, fields[0].position.y);
};

export const initializeLayout = async () => {
  if (process.stdout.isTTY) {
    renderLayout(process.stdout.rows, process.stdout.columns);

    process.stdout.on("resize", () => {
      renderLayout(process.stdout.rows, process.stdout.columns);
    });
  } else {
    console.log(chalk.red("[Critical] stdout is not a terminal (TTY)."));
    process.exit(1);
  }
};
