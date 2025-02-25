-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: blofin
-- ------------------------------------------------------
-- Server version	8.0.41-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `candle`
--

DROP TABLE IF EXISTS `candle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candle` (
  `instrument` binary(3) NOT NULL,
  `period` binary(3) NOT NULL,
  `bar_time` datetime NOT NULL,
  `open` double NOT NULL,
  `high` double NOT NULL,
  `low` double NOT NULL,
  `close` double NOT NULL,
  `volume` int NOT NULL,
  `vol_currency` int NOT NULL,
  `vol_currency_quote` int NOT NULL,
  `completed` tinyint(1) NOT NULL,
  PRIMARY KEY (`instrument`,`period`,`bar_time`),
  KEY `fk_c_period` (`period`),
  CONSTRAINT `fk_c_instrument` FOREIGN KEY (`instrument`) REFERENCES `instrument` (`instrument`),
  CONSTRAINT `fk_c_period` FOREIGN KEY (`period`) REFERENCES `period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_type`
--

DROP TABLE IF EXISTS `contract_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_type` (
  `contract_type` binary(3) NOT NULL,
  `source_ref` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `description` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  PRIMARY KEY (`contract_type`),
  UNIQUE KEY `ak_contract_type` (`source_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `currency`
--

DROP TABLE IF EXISTS `currency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `currency` (
  `currency` binary(3) NOT NULL,
  `symbol` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `image_url` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs DEFAULT NULL,
  `suspense` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`currency`),
  UNIQUE KEY `ak_currency` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `instrument`
--

DROP TABLE IF EXISTS `instrument`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `instrument` (
  `instrument` binary(3) NOT NULL,
  `base_currency` binary(3) NOT NULL,
  `quote_currency` binary(3) NOT NULL,
  `trade_period` binary(3) DEFAULT NULL,
  `interval_period` binary(3) DEFAULT NULL,
  PRIMARY KEY (`instrument`),
  UNIQUE KEY `ak_instrument` (`base_currency`,`quote_currency`),
  KEY `fk_i_quote_currency` (`quote_currency`),
  KEY `fk_i_trade_period` (`trade_period`),
  KEY `fk_i_interval_period` (`interval_period`),
  CONSTRAINT `fk_i_base_currency` FOREIGN KEY (`base_currency`) REFERENCES `currency` (`currency`),
  CONSTRAINT `fk_i_interval_period` FOREIGN KEY (`interval_period`) REFERENCES `period` (`period`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_i_quote_currency` FOREIGN KEY (`quote_currency`) REFERENCES `currency` (`currency`),
  CONSTRAINT `fk_i_trade_period` FOREIGN KEY (`trade_period`) REFERENCES `period` (`period`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `instrument_detail`
--

DROP TABLE IF EXISTS `instrument_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `instrument_detail` (
  `instrument` binary(3) NOT NULL,
  `instrument_type` binary(3) NOT NULL,
  `contract_type` binary(3) NOT NULL,
  `contract_value` decimal(13,2) NOT NULL,
  `max_leverage` int NOT NULL,
  `min_size` decimal(5,3) NOT NULL,
  `lot_size` decimal(5,3) NOT NULL,
  `tick_size` double NOT NULL,
  `max_limit_size` decimal(13,2) NOT NULL,
  `max_market_size` decimal(13,2) NOT NULL,
  `list_time` datetime NOT NULL,
  `expiry_time` datetime NOT NULL,
  PRIMARY KEY (`instrument`),
  KEY `fk_instrument_type` (`instrument_type`),
  KEY `fk_contract_type` (`contract_type`),
  CONSTRAINT `fk_id_contract_type` FOREIGN KEY (`contract_type`) REFERENCES `contract_type` (`contract_type`),
  CONSTRAINT `fk_id_instrument` FOREIGN KEY (`instrument`) REFERENCES `instrument` (`instrument`),
  CONSTRAINT `fk_id_instrument_type` FOREIGN KEY (`instrument_type`) REFERENCES `instrument_type` (`instrument_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `instrument_period`
--

DROP TABLE IF EXISTS `instrument_period`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `instrument_period` (
  `instrument` binary(3) NOT NULL,
  `period` binary(3) NOT NULL,
  `data_collection_rate` smallint NOT NULL DEFAULT (0),
  `sma_factor` smallint NOT NULL DEFAULT '0',
  PRIMARY KEY (`instrument`,`period`),
  KEY `fk_ip_period` (`period`),
  CONSTRAINT `fk_ip_instrument` FOREIGN KEY (`instrument`) REFERENCES `instrument` (`instrument`),
  CONSTRAINT `fk_ip_period` FOREIGN KEY (`period`) REFERENCES `period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `instrument_type`
--

DROP TABLE IF EXISTS `instrument_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `instrument_type` (
  `instrument_type` binary(3) NOT NULL,
  `source_ref` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `description` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  PRIMARY KEY (`instrument_type`),
  UNIQUE KEY `ak_instrument_type` (`source_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `period`
--

DROP TABLE IF EXISTS `period`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `period` (
  `period` binary(3) NOT NULL,
  `timeframe` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `description` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  PRIMARY KEY (`period`),
  UNIQUE KEY `ak_period` (`timeframe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_active_instruments`
--

DROP TABLE IF EXISTS `vw_active_instruments`;
/*!50001 DROP VIEW IF EXISTS `vw_active_instruments`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_active_instruments` AS SELECT 
 1 AS `instrument`,
 1 AS `instrument_pair`,
 1 AS `period`,
 1 AS `timeframe`,
 1 AS `base_currency`,
 1 AS `base_symbol`,
 1 AS `quote_currency`,
 1 AS `quote_symbol`,
 1 AS `data_collection_rate`,
 1 AS `sma_factor`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_candles`
--

DROP TABLE IF EXISTS `vw_candles`;
/*!50001 DROP VIEW IF EXISTS `vw_candles`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_candles` AS SELECT 
 1 AS `instrument`,
 1 AS `instrument_pair`,
 1 AS `period`,
 1 AS `timeframe`,
 1 AS `bar_time`,
 1 AS `open`,
 1 AS `high`,
 1 AS `low`,
 1 AS `close`,
 1 AS `volume`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_instruments`
--

DROP TABLE IF EXISTS `vw_instruments`;
/*!50001 DROP VIEW IF EXISTS `vw_instruments`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_instruments` AS SELECT 
 1 AS `instrument`,
 1 AS `instrument_pair`,
 1 AS `period`,
 1 AS `timeframe`,
 1 AS `base_currency`,
 1 AS `base_symbol`,
 1 AS `quote_currency`,
 1 AS `quote_symbol`,
 1 AS `data_collection_rate`,
 1 AS `sma_factor`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_trade_instruments`
--

DROP TABLE IF EXISTS `vw_trade_instruments`;
/*!50001 DROP VIEW IF EXISTS `vw_trade_instruments`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_trade_instruments` AS SELECT 
 1 AS `instrument`,
 1 AS `currency_pair`,
 1 AS `base_currency`,
 1 AS `base_symbol`,
 1 AS `quote_currency`,
 1 AS `quote_symbol`,
 1 AS `trade_period`,
 1 AS `trade_timeframe`,
 1 AS `interval_period`,
 1 AS `interval_timeframe`,
 1 AS `data_collection_rate`,
 1 AS `sma_factor`,
 1 AS `contract_value`,
 1 AS `max_leverage`,
 1 AS `min_size`,
 1 AS `lot_size`,
 1 AS `tick_size`,
 1 AS `precision`,
 1 AS `max_limit_size`,
 1 AS `max_market_size`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'blofin'
--

--
-- Final view structure for view `vw_active_instruments`
--

/*!50001 DROP VIEW IF EXISTS `vw_active_instruments`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_active_instruments` AS select `i`.`instrument` AS `instrument`,concat(`b`.`symbol`,'-',`q`.`symbol`) AS `instrument_pair`,`pt`.`period` AS `period`,`pt`.`timeframe` AS `timeframe`,`b`.`currency` AS `base_currency`,`b`.`symbol` AS `base_symbol`,`q`.`currency` AS `quote_currency`,`q`.`symbol` AS `quote_symbol`,`ip`.`data_collection_rate` AS `data_collection_rate`,`ip`.`sma_factor` AS `sma_factor` from ((((`instrument` `i` join `instrument_period` `ip`) join `period` `pt`) join `currency` `b`) join `currency` `q`) where ((`i`.`base_currency` = `b`.`currency`) and (`i`.`quote_currency` = `q`.`currency`) and (`i`.`instrument` = `ip`.`instrument`) and (`ip`.`period` = `pt`.`period`) and (`ip`.`data_collection_rate` > 0) and (`b`.`suspense` = false)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_candles`
--

/*!50001 DROP VIEW IF EXISTS `vw_candles`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_candles` AS select `i`.`instrument` AS `instrument`,concat(`b`.`symbol`,'-',`q`.`symbol`) AS `instrument_pair`,`pt`.`period` AS `period`,`pt`.`timeframe` AS `timeframe`,`c`.`bar_time` AS `bar_time`,`c`.`open` AS `open`,`c`.`high` AS `high`,`c`.`low` AS `low`,`c`.`close` AS `close`,`c`.`volume` AS `volume` from (((((`instrument` `i` join `instrument_period` `ip`) join `period` `pt`) join `currency` `b`) join `currency` `q`) join `candle` `c`) where ((`c`.`instrument` = `i`.`instrument`) and (`c`.`period` = `pt`.`period`) and (`i`.`base_currency` = `b`.`currency`) and (`i`.`quote_currency` = `q`.`currency`) and (`i`.`instrument` = `ip`.`instrument`) and (`ip`.`period` = `pt`.`period`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_instruments`
--

/*!50001 DROP VIEW IF EXISTS `vw_instruments`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_instruments` AS select `i`.`instrument` AS `instrument`,concat(`b`.`symbol`,'-',`q`.`symbol`) AS `instrument_pair`,`pt`.`period` AS `period`,`pt`.`timeframe` AS `timeframe`,`b`.`currency` AS `base_currency`,`b`.`symbol` AS `base_symbol`,`q`.`currency` AS `quote_currency`,`q`.`symbol` AS `quote_symbol`,`ip`.`data_collection_rate` AS `data_collection_rate`,`ip`.`sma_factor` AS `sma_factor` from ((((`instrument` `i` join `instrument_period` `ip`) join `period` `pt`) join `currency` `b`) join `currency` `q`) where ((`i`.`base_currency` = `b`.`currency`) and (`i`.`quote_currency` = `q`.`currency`) and (`i`.`instrument` = `ip`.`instrument`) and (`ip`.`period` = `pt`.`period`) and (`ip`.`data_collection_rate` > 0) and (`b`.`suspense` = false)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_trade_instruments`
--

/*!50001 DROP VIEW IF EXISTS `vw_trade_instruments`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_trade_instruments` AS select `i`.`instrument` AS `instrument`,concat(`b`.`symbol`,'-',`q`.`symbol`) AS `currency_pair`,`b`.`currency` AS `base_currency`,`b`.`symbol` AS `base_symbol`,`q`.`currency` AS `quote_currency`,`q`.`symbol` AS `quote_symbol`,`tp`.`period` AS `trade_period`,`tp`.`timeframe` AS `trade_timeframe`,`ti`.`period` AS `interval_period`,`ti`.`timeframe` AS `interval_timeframe`,`ip`.`data_collection_rate` AS `data_collection_rate`,`ip`.`sma_factor` AS `sma_factor`,`id`.`contract_value` AS `contract_value`,`id`.`max_leverage` AS `max_leverage`,`id`.`min_size` AS `min_size`,`id`.`lot_size` AS `lot_size`,`id`.`tick_size` AS `tick_size`,length(substring_index(cast(`id`.`tick_size` as char charset utf8mb4),'.',-(1))) AS `precision`,`id`.`max_limit_size` AS `max_limit_size`,`id`.`max_market_size` AS `max_market_size` from ((((((`instrument` `i` join `instrument_period` `ip`) join `instrument_detail` `id`) join `currency` `b`) join `currency` `q`) join `period` `tp`) join `period` `ti`) where ((`i`.`instrument` = `id`.`instrument`) and (`i`.`instrument` = `ip`.`instrument`) and (`i`.`trade_period` = `ip`.`period`) and (`i`.`trade_period` = `tp`.`period`) and (`i`.`interval_period` = `ti`.`period`) and (`i`.`base_currency` = `b`.`currency`) and (`i`.`quote_currency` = `q`.`currency`) and (`ip`.`data_collection_rate` > 0) and (`b`.`suspense` = false)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-02-22 15:09:31
