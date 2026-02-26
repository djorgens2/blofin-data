/**
 * @module Table-Renderer
 * @description Universal CLI table with strict numeric alignment and full-width framing.
 */

import { bold, gray } from "console-log-colors";

export interface ITableConfig<T> {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  color?: (val: any) => string;
}

/**
 * Clean Grid Renderer
 */
export const renderTable = <T extends object>(
  data: T[],
  schema: ITableConfig<T>[],
  options: { margin?: number; gutter?: number; statusKey?: keyof T } = { margin: 4, gutter: 4 }
) => {
  const indent = " ".repeat(options.margin || 4);
  const gutterStr = " ".repeat(options.gutter || 4);
  const statusWidth = 4; // Width of "🔹  " (Icon + 2 spaces)

  // 1. Calculate Content Widths
  const widths = schema.map((col) => {
    const longestData = data.reduce((max, row: any) => {
      return Math.max(max, String(row[col.key] ?? "").length);
    }, col.label.length);
    return longestData;
  });

  // 2. Build the Header Row
  const headerRow = schema.map((col, i) => {
    return col.align === "right" 
      ? bold(col.label.padStart(widths[i])) 
      : bold(col.label.padEnd(widths[i]));
  }).join(gutterStr);

  // 3. Mathematical Bar Length: (Status + HeaderRow)
  // No +2 or +3 needed; it's simply the sum of everything we just built.
  const contentWidth = widths.reduce((a, b) => a + b, 0) + (gutterStr.length * (schema.length - 1));
  const totalBarWidth = statusWidth + contentWidth;

  // 4. Print Header
  console.log(`\n${indent}${bold(" ".repeat(statusWidth) + headerRow)}`);
  console.log(`${indent}${gray("─".repeat(totalBarWidth))}`);

  // 5. Print Data Rows
  data.forEach((row: any) => {
    const icon = options.statusKey 
      ? (row[options.statusKey] === "Enabled" ? "🔹  " : "🔸  ") 
      : "    ";

    const dataRow = schema.map((col, i) => {
      const val = String(row[col.key] ?? "");
      const padded = col.align === "right" 
        ? val.padStart(widths[i]) 
        : val.padEnd(widths[i]);

      return col.color ? col.color(padded) : gray(padded);
    }).join(gutterStr);

    console.log(`${indent}${icon}${dataRow}`);
  });
  console.log("");
};
