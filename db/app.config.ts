//+------------------------------------------------------------------+
//|                                                    app.config.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

import { hasValues } from "lib/std.util";
import { Select } from "./query.utils";

interface IAppConfig {
  candle_max_fetch: number;
  leverage_max_fetch: number;
  orders_max_fetch: number;
  default_sma: number;
}

const appConfig: Partial<IAppConfig> = {};

export const AppConfig = () => {
  return appConfig;
};

const initialize = async () => {
  if (hasValues(appConfig)) return appConfig;

  const promise = Select<IAppConfig>({}, { table: "app_config" });
  const [config] = await promise;

  config && Object.assign(appConfig, config);
  return config;
};

initialize()
  .then(() => {
    console.log("config loaded");
  })
  .catch(() => console.log("error in appConfig"));
