/**
 * @file q.ts
 * @description Database Query Utility & Report Generator
 * @version 2.1.0
 * @author Dev
 *
 * FEATURES:
 * - Auto-Hexification: Maps binary/hex keys from hexKeys registry.
 * - Tip-of-Spear Sync: Handles "Papa Mama" backoff for real-time candle gaps.
 * - Timezone Normalization: Converts GMT/UTC API timestamps to PST (UTC-8).
 * - Multi-Output: Console Table, Responsive HTML Grid (--html), or TradingView Chart (--chart).
 *
 * @notes
 * - To trigger the File-Watcher: Run with `nodemon --exec "ts-node src/q.ts -bars '{\"limit\":10}' --html"`
 * - Ensure templates exist in ../templates/ relative to this file.
 */

"user strict";

import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { exec } from "child_process";
import { hexify } from "#lib/crypto.util";
import {
  Account,
  Activity,
  Authority,
  Broker,
  Candle,
  ContractType,
  Currency,
  Environment,
  InstrumentDetail,
  InstrumentPeriod,
  InstrumentPosition,
  Instrument,
  InstrumentType,
  JobControl,
  Leverage,
  Order,
  Period,
  Positions,
  Reference,
  Request,
  RoleAuthority,
  Role,
  State,
  StopOrder,
  StopRequest,
  TaskGroup,
  User,
} from "#db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * TYPES & MAPPINGS
 *
 */

type SubjectModule = {
  Fetch: (props: any, options: { table?: string; limit?: number; suffix?: string }) => Promise<any[] | undefined>;
  table?: string;
};

const SubjectMap: Record<string, SubjectModule> = {
  "-a": Account,
  "-act": Activity,
  "-auth": Authority,
  "-b": Broker,
  "-bars": Candle,
  "-ctype": ContractType,
  "-sym": Currency,
  "-e": Environment,
  "-id": InstrumentDetail,
  "-iper": InstrumentPeriod,
  "-ipos": InstrumentPosition,
  "-i": Instrument,
  "-itype": InstrumentType,
  "-j": JobControl,
  "-l": Leverage,
  "-ord": Order,
  "-p": Period,
  "-pos": Positions,
  "-ref": Reference,
  "-req": Request,
  "-rauth": RoleAuthority,
  "-r": Role,
  "-s": State,
  "-so": StopOrder,
  "-sr": StopRequest,
  "-tg": TaskGroup,
  "-u": User,
};

const hexKeys = [
  "account",
  "activity",
  "authority",
  "base_currency",
  "broker",
  "cancel_source",
  "client_order_id",
  "contract_type",
  "currency",
  "environment",
  "fibonacci",
  "fractal",
  "hash",
  "instrument",
  "instrument_position",
  "instrument_type",
  "new_state",
  "old_state",
  "order_category",
  "order_id",
  "order_state",
  "password",
  "period",
  "positions",
  "quote_currency",
  "request",
  "request_type",
  "role",
  "state",
  "stop_request",
  "stop_type",
  "task_group",
  "tpsl_id",
  "user",
];

const PrettyNames: Record<string, string> = {
  "-a": "Account",
  "-act": "Activity",
  "-auth": "Authority",
  "-b": "Broker",
  "-bars": "Candle",
  "-ctype": "ContractType",
  "-sym": "Currency",
  "-e": "Environment",
  "-id": "InstrumentDetail",
  "-iper": "InstrumentPeriod",
  "-ipos": "InstrumentPosition",
  "-i": "Instrument",
  "-itype": "InstrumentType",
  "-j": "JobControl",
  "-l": "Leverage",
  "-ord": "Order",
  "-p": "Period",
  "-pos": "Positions",
  "-ref": "Reference",
  "-req": "Request",
  "-rauth": "RoleAuthority",
  "-r": "Role",
  "-s": "State",
  "-so": "StopOrder",
  "-sr": "StopRequest",
  "-tg": "TaskGroup",
  "-u": "User",
};

/**
 * UTILS: HEX & TIME
 */
const PST_OFFSET = 8 * 60 * 60 * 1000;

/**
 * REPORT GENERATORS
 */
const launchReport = (rows: any[], subject: string) => {
  if (!rows.length) return console.error("No rows to report.");

  // 1. Generate the Table Parts
  const headers = Object.keys(rows[0])
    .map((k) => `<th>${k}</th>`)
    .join("");

  const htmlBody = rows
    .map((row) => {
      const cells = Object.entries(row)
        .map(([key, val]) => {
          // TABLE REQUIREMENT: Keep IDs as Hex for the dev-grid
          let display = val;
          if (hexKeys.includes(key)) {
            const hex = Buffer.isBuffer(val) ? val.toString("hex") : String(val).replace("0x", "");
            display = `0x${hex}`;
          }
          return `<td>${display}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  // 2. Load and Inject into Template
  const templatePath = join(__dirname, "./templates/report.template.html");
  let html = readFileSync(templatePath, "utf8");

  html = html.replaceAll("{{SUBJECT}}", subject).replace("{{DATE}}", new Date().toLocaleString()).replace("{{HEADERS}}", headers).replace("{{BODY}}", htmlBody);

  // 3. Write and Launch
  const fileName = `./report_${Date.now()}.html`;
  writeFileSync(fileName, html);
  openFile(fileName);
};

const launchChartReport = (rows: any[], displayName: string) => {
  // 1. Prepare Chart Data (exactly as you had it)
  const chartData = rows
    .map((r) => ({
      time: Math.floor(new Date(r.timestamp || r.update_time).getTime() / 1000),
      open: parseFloat(r.open),
      high: parseFloat(r.high),
      low: parseFloat(r.low),
      close: parseFloat(r.close),
    }))
    .sort((a, b) => a.time - b.time);

  // 2. Prepare Table Data (Build your HTML strings for the table)
  const tableHeaders = Object.keys(rows[0])
    .map(k => `<th>${k}</th>`)
    .join('');

  const tableBody = rows.map(row => {
    const cells = Object.entries(row).map(([key, val]) => {
      let display = val;
      if (hexKeys.includes(key)) {
        // Ensure Buffers or raw strings are converted to 0x-prefixed hex
        const hex = Buffer.isBuffer(val) ? val.toString('hex') : String(val).replace('0x', '');
        display = `0x${hex}`;
      }
      return `<td>${display}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // 3. Load and Inject
  const templatePath = join(__dirname, "templates", "chart.template.html");
  let html = readFileSync(templatePath, "utf8");

  // The "Injection" - Swapping placeholders for real data strings
  html = html
    .replaceAll("{{SUBJECT}}", displayName)
    .replaceAll("{{TABLE_HEADERS}}", tableHeaders)
    .replaceAll("{{TABLE_BODY}}", tableBody)
    .replaceAll("{{DATA}}", JSON.stringify(chartData)); // This turns the array into a JS-readable string

  // 4. Finalize
  const fileName = `./chart_${Date.now()}.html`;
  writeFileSync(fileName, html);
  openFile(fileName);
};

const openFile = (file: string) => {
  const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${start} ${file}`);
};

/**
 * MAIN EXECUTION WITH COOLDOWN LOGIC
 */
async function run(retries = 3, backoff = 2000) {
  const [flag, rawJson] = process.argv.slice(2);

  if (!flag || !SubjectMap[flag]) {
    console.error('Usage: q -p \'{"period":"..."}\' [--html|--chart]');
    process.exit(1);
  }

  try {
    const props = JSON.parse(rawJson || "{}");

    // Auto-Hexify inputs based on registry
    Object.keys(props).forEach((key) => {
      if (hexKeys.includes(key) && props[key]) props[key] = hexify(props[key]);
    });

    const module = SubjectMap[flag];
    const prettyName = PrettyNames[flag] || "Unknown";
    const displayName = `${prettyName} [${flag}]`;

    const { table, limit, suffix, ...restProps } = props;

    const rows = await module.Fetch(restProps, {
      table: table || (module as any).table,
      limit: limit || 100,
      suffix: suffix || "",
    });

    if (!rows || rows.length === 0) {
      if (retries > 0) {
        console.error(`No data found (Tip of Spear). Papa Mama cooldown: ${backoff}ms...`);
        await new Promise((res) => setTimeout(res, backoff));
        return run(retries - 1, backoff * 2); // Exponential Backoff
      }
      console.error("Fetch failed after retries.");
      process.exit(0);
    }

    if (process.argv.includes("--html")) launchReport(rows, displayName);
    else if (process.argv.includes("--chart")) launchChartReport(rows, flag);
    else if (process.argv.includes("--tab")) console.table(rows.map((r) => ({ ...r, timestamp: new Date(r.timestamp - PST_OFFSET).toLocaleString() })));
    else console.log(rows);
    
    process.exit(0);
  } catch (e: any) {
    console.error("Execution Error:", e.message);
    process.exit(1);
  }
}

run();
