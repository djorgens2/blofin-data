/**
 * @module database/config
 * @description
 * Core MySQL connection management for high-frequency synchronization.
 * Handles dynamic configuration hydration with strict immutability guards.
 *
 * (c) 2018, Dennis Jorgenson
 */
"use strict";

import mysql from "mysql2/promise";

/**
 * Validated database configuration structure.
 */
interface IDbConfig {
  host: string;
  user: string;
  password: string;
  database: string;

  /** Maximum concurrent connections in the pool. */
  connectionLimit: number;
  /** Maximum number of idle connections to retain. */
  maxIdle: number;
  /** Milliseconds before an idle connection is released. */
  idleTimeout: number;
  /** If true, pool queues requests when limit is reached. */
  waitForConnections: boolean;
  /** Maximum number of queued requests (0 for unlimited). */
  queueLimit: number;
  /** TCP Keep-alive probe toggle. */
  enableKeepAlive: boolean;
  /** Delay before first keep-alive probe is sent. */
  keepAliveInitialDelay: number;
  /** Timeout for establishing initial connection. */
  connectTimeout: number;
  /** If true, cast MySQL Decimal types to JS numbers. */
  decimalNumbers: boolean;
}

/**
 * Hard-coded safety net for the database layer.
 * Values are used as base-defaults before environment hydration.
 */
const DEFAULT_CONFIG: IDbConfig = {
  host: ``,
  user: ``,
  password: ``,
  database: ``,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 15000,
  decimalNumbers: true,
};

/** Container for non-standard or emergency MySQL driver parameters. */
type IExtConfig = Record<string, any>;

/**
 * Processes environment-sourced configuration data.
 * Merges DEFAULT_CONFIG with the DB_CONFIG JSON blob.
 *
 * @returns Object} result - Frozen configuration sets.
 * @returns Partial<IDbConfig> result.config - Verified core attributes.
 * @returns IExtConfig} result.extConfig - Unverified passthrough attributes.
 * @throws Error} Fails if JSON is malformed or credentials are missing.
 */
export const getDbConfig = (): { config: Partial<IDbConfig>; extConfig: IExtConfig } => {
  try {
    const unverified: IExtConfig = process.env.DB_CONFIG ? { ...DEFAULT_CONFIG, ...JSON.parse(process.env.DB_CONFIG) } : undefined;
    console.error({unverified})

    if (!unverified) throw new Error();

    const config: IExtConfig = {};
    const extConfig: IExtConfig = {};

    // Segment verified core from dynamic extensions
    Object.keys(unverified).forEach((key) => {
      const value = unverified[key];

      if (key in DEFAULT_CONFIG) {
        config[key] = value;
      } else {
        process.stdout.write(`>> [WARN] Extension Param Detected: ${key}\n`);
        extConfig[key] = value;
      }
    });

    // Credential Guard
    if (!config.host || !config.user || !config.password || !config.database!) {
      process.stderr.write("-> [Error] dbConfig: Invalid or unauthorized credentials;");
      throw new Error();
    }

    return { config: Object.freeze(config) satisfies Partial<IDbConfig>, extConfig: Object.freeze(extConfig) satisfies IExtConfig };
  } catch (e) {
    throw new Error("-> [Error] dbConfig: Malformed DB_CONFIG JSON in .env");
  }
};

/** Internal configuration instance. */
const local = getDbConfig();

/**
 * Primary MySQL Connection Pool.
 * Spreads verified config and unverified extensions into driver.
 */
export const pool = mysql.createPool({ ...local.config, ...local.extConfig });

/** The active MySQL schema (database) context. */
export const DB_SCHEMA = local.config.database;

/**
 * Acquires a connection and initiates an atomic transaction.
 * @returns Promise<mysql.PoolConnection> - The active transaction connection.
 */
export const Begin = async () => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
};

/**
 * Persists transaction changes and releases connection to the pool.
 * @param mysql.PoolConnection connection - The active transaction connection.
 */
export const Commit = async (connection: mysql.PoolConnection) => {
  await connection.commit();
  connection.release();
};

/**
 * Reverts transaction changes and releases connection to the pool.
 * @param mysql.PoolConnection connection - The active transaction connection.
 */
export const Rollback = async (connection: mysql.PoolConnection) => {
  await connection.rollback();
  connection.release();
};
