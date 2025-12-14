//+---------------------------------------------------------------------------------------+
//|                                                                           json2csv.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import * as fs from "fs";
import * as path from "path";

interface ApiResponse {
  code: string;
  msg: string;
  data: string[][] | Array<object>;
}

const args = process.argv.slice(2); // get file name
const [cli_fname] = args;
const inputFilePath = path.join(__dirname, `${cli_fname}.json`);

function readJsonFile(filePath: string): ApiResponse {
  try {
    const jsonString = fs.readFileSync(filePath, "utf-8");
    const data: ApiResponse = JSON.parse(jsonString);
    return data;
  } catch (error) {
    console.error("Error reading or parsing JSON file:", error);
    throw error;
  }
}

function convertJsonToCsv(apiResponse: ApiResponse): string {
  if (apiResponse.code !== "0" || !apiResponse.data || apiResponse.data.length === 0) {
    return "";
  }

  // Assuming headers based on your previous data
  //  const header = "Timestamp,Open,High,Low,Close,Volume,CurrencyVolume,TradeAmount,Flag";
  //  const csvRows = apiResponse.data.map((row) => row.join(","));
  const csvRows = apiResponse.data.map((row) => Object.values(row).join(","));
  const header = Object.keys(apiResponse.data[0]).join(",");
  const csvString = [header, ...csvRows].join("\n");

  return csvString;
}

const outputFilePath = path.join(__dirname, `${cli_fname}.csv`);

function writeCsvFile(filePath: string, csvContent: string): void {
  try {
    fs.writeFileSync(filePath, csvContent, "utf-8");
    console.log(`Successfully wrote CSV data to ${filePath}`);
  } catch (error) {
    console.error("Error writing CSV file:", error);
    throw error;
  }
}

// Assume the above functions (readJsonFile, convertJsonToCsv, writeCsvFile) are available

async function processApiFile() {
  const jsonData = readJsonFile(inputFilePath);
  const csvContent = convertJsonToCsv(jsonData);

  if (csvContent) {
    writeCsvFile(outputFilePath, csvContent);
  } else {
    console.log("No data to write to CSV.");
  }
}

processApiFile();
