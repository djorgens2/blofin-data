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

const SubjectMap: Record<string, any> = {
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

import { writeFileSync } from "fs";
import { exec } from "child_process";

/**
 * @function dehexify
 * @description Attempts to convert a hex string back to UTF-8 for readability.
 */
const dehexify = (val: any): string => {
  if (val === null || val === undefined) return "";
  
  // Convert Buffers or Hex-prefixed strings to clean hex
  let hex = Buffer.isBuffer(val) ? val.toString('hex') : String(val);
  if (hex.startsWith('0x')) hex = hex.slice(2);

  // Validate: Must be valid Hex characters and even length
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return String(val);

  try {
    const decoded = Buffer.from(hex, 'hex').toString('utf8');
    // Only return if it's printable ASCII (prevents showing binary blobs as garbage)
    return /^[\x20-\x7E\s]*$/.test(decoded) ? decoded : `0x${hex}`;
  } catch {
    return `0x${hex}`;
  }
};

/**
 * @function launchReport
 * @description Generates a responsive HTML table from DB rows and opens it in the browser.
 */
const launchReport = (rows: any[], subject: string) => {
  const htmlBody = rows
    .map((row) => {
      const cells = Object.entries(row)
        .map(([key, val]) => {
          // A. CHECK REGISTRY: If the column is a known Hex Key, keep it as 0x...
          if (hexKeys.includes(key)) {
            const hexValue = Buffer.isBuffer(val) ? val.toString("hex") : String(val).replace("0x", "");
            return `<td class="hex-cell" title="Raw ID">0x${hexValue}</td>`;
          }

          // B. METADATA: If it's NOT in the registry, it's likely human-readable text
          // We pass it through a simpler dehexify to catch any stray hexed strings
          const displayValue = dehexify(val);
          return `<td title="${val}">${displayValue}</td>`;
        })
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");
  const html = `
  <html>
  <head>
    <title>Query: ${subject}</title>
    <style>
      body {
        font-family: sans-serif;
        background: #1a1a1a;
        color: #eee;
        padding: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
      }
      /* Tablesort needs a pointer cursor to show it's clickable */
      th {
        background: #333;
        position: sticky;
        top: 0;
        cursor: pointer;
        user-select: none;
      }
      th:after {
        content: " ↕";
        font-size: 0.8em;
        opacity: 0.5;
      }
      th,
      td {
        border: 1px solid #444;
        padding: 8px 12px;
        text-align: left;
      }
      tr:nth-child(even) {
        background: #252525;
      }
      tr:hover {
        background: #3d3d3d;
      }
      th {
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1px;
        color: #666;
      }
      td {
        font-weight: 500;
        color: #fff;
      }
      /* Highlight columns like 'status' or 'timeframe' */
      td:contains("Enabled") {
        color: #26a69a;
      }
      td:contains("Disabled") {
        color: #ef5350;
      }
        /* In your q.ts HTML Template */
      td:contains("unprovisioned") { 
        color: #848e9c; 
        font-style: italic; 
        opacity: 0.7; 
      }
      td:contains("running") { 
        color: #26a69a; 
        font-weight: bold; 
      }
    </style>
  </head>
  <body>
    <h2>${subject} Report - ${new Date().toLocaleString()}</h2>
    <table id="sort-table">
      <thead>
        <tr>
          ${Object.keys(rows[0]) .map((k) => `
          <th>${k}</th>
          `) .join("")}
        </tr>
      </thead>
      <tbody>
        ${htmlBody}
      </tbody>
    </table>

    <!-- Load the library from a valid CDN path -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tablesort/5.2.1/tablesort.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tablesort/5.2.1/tablesort.number.min.js"></script>

    <script>
      // Initialize the sort on your table ID
      new Tablesort(document.getElementById("sort-table"));
    </script>
  </body>
</html>`;

  const fileName = `./report_${Date.now()}.html`;
  writeFileSync(fileName, html);

  // Cross-platform open (macOS: 'open', Windows: 'start', Linux: 'xdg-open')
  const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${start} ${fileName}`);

  console.log(`[Info] Report launched in browser: ${fileName}`);
};

const launchChartReport = (rows: any[], subject: string) => {
  // 1. Prepare data for TradingView (expects { time, open, high, low, close })
  // Note: time must be a Unix timestamp (seconds) or 'YYYY-MM-DD'
  const chartData = rows
    .map((r) => ({
      time: Math.floor(new Date(r.timestamp || r.update_time).getTime() / 1000),
      open: parseFloat(r.open),
      high: parseFloat(r.high),
      low: parseFloat(r.low),
      close: parseFloat(r.close),
    }))
    .sort((a, b) => a.time - b.time);

const tableHeaders = Object.keys(rows[0]).map(k => `<th>${k}</th>`).join('');
const tableBody = rows.map(row => {
  const cells = Object.entries(row).map(([key, val]) => {
    // TABLE REQUIREMENT: Keep IDs as Hex for the dev-grid
    let display = val;
    if (hexKeys.includes(key)) {
      const hex = Buffer.isBuffer(val) ? val.toString('hex') : String(val).replace('0x', '');
      display = `0x${hex}`;
    }
    return `<td>${display}</td>`;
  }).join('');
  return `<tr>${cells}</tr>`;
}).join('');
const html = `
<html>
<head>
  <title>2026 Engine: ${subject}</title>
  <style>
    body { background: #131722; color: #d1d4dc; font-family: 'Cascadia Code', monospace; margin: 0; padding: 20px; }
    #chart-container { width: 100%; height: 450px; border: 1px solid #2f333d; margin-bottom: 30px; }
    
    /* Table Styling - The Grid */
    .grid-container { overflow-x: auto; background: #1c202b; border-radius: 8px; padding: 10px; }
    table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: 12px; }
    th { background: #2f333d; color: #848e9c; cursor: pointer; padding: 12px; text-align: left; position: sticky; top: 0; }
    th:hover { color: #fff; }
    td { border-bottom: 1px solid #2f333d; padding: 8px 12px; color: #e1e3e6; }
    tr:hover { background: #2b2f3a; }
    
    h2 { color: #f0b90b; margin-top: 0; }
  </style>
</head>
<body>
  <h2>${subject} Monitor</h2>
  
  <!-- PART 1: VISUAL (CLEAN) -->
  <div id="chart-container"></div>

  <!-- PART 2: DATA GRID (HEX) -->
  <div class="grid-container">
    <table id="target-table">
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>${tableBody}</tbody>
    </table>
  </div>

  <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tablesort/5.2.1/tablesort.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tablesort/5.2.1/tablesort.number.min.js"></script>

  <script>
    try {
      // 1. Initialize Tablesort
      new Tablesort(document.getElementById('target-table'));

      // 2. Initialize Chart (Uses clean numeric chartData passed from TS)
      const chart = LightweightCharts.createChart(document.getElementById('chart-container'), {
        layout: { background: { color: '#131722' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#2f333d' }, horzLines: { color: '#2f333d' } },
        timeScale: { timeVisible: true }
      });

      const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
        upColor: '#26a69a', downColor: '#ef5350',
        wickUpColor: '#26a69a', wickDownColor: '#ef5350'
      });

      // chartData was already cleaned/sorted in our TS logic
      candleSeries.setData(${JSON.stringify(chartData)});
      chart.timeScale().fitContent();

    } catch (e) { console.error("Frontend Init Error:", e); }
  </script>
</body>
</html>`
  const fileName = `./chart_${Date.now()}.html`;
  writeFileSync(fileName, html);

  // Cross-platform open (macOS: 'open', Windows: 'start', Linux: 'xdg-open')
  const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${start} ${fileName}`);

  console.log(`[Info] Report launched in browser: ${fileName}`);
};

async function run() {
  const [flag, rawJson] = process.argv.slice(2);

  if (!flag || !SubjectMap[flag]) {
    console.error('Usage: q -a \'{"account":"..."}\'');
    process.exit(1);
  }

  try {
    // Let Node/TS handle the JSON parsing, not sed!
    const props = JSON.parse(rawJson);

    // Auto-Hexification Plumbing
    Object.keys(props).forEach((key) => {
      // 2. If the key exists in our binary/hex registry, hexify it in-place
      if (hexKeys.includes(key) && props[key]) {
        props[key] = hexify(props[key]);
      }
    });

    const module = SubjectMap[flag];
    const { table, limit, suffix, ...restProps } = props;
    const rows = await module.Fetch(restProps, { table: table || module.table, limit: limit || 100, suffix: suffix || "" });

    if (process.argv.includes("--html")) {
      launchReport(rows, flag);
    } else if (process.argv.includes("--chart")) {
      launchChartReport(rows, flag);
    } else {
      console.table(rows);
    }
    process.exit(0);
  } catch (e: any) {
    console.error("Invalid JSON or Query Error:", e.message);
  }
}

run();

// trade markers;
// In the browser script, after candleSeries.setData:
//candleSeries.setMarkers([
//  { time: 1771725600, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY @ 68137' },
//  { time: 1771726500, position: 'aboveBar', color: '#e91e63', shape: 'arrowDown', text: 'SELL @ 68184' }
//]);
