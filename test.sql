delete from request;
select * from vw_requests;
select * from vw_orders;
select * from orders;
select * from vw_api_requests;

{
"select * from vw_requests": [
	{
		"client_order_id" : "~\u0004J",
		"status" : "Queued",
		"account" : "\u0014Zj",
		"instrument" : "N>�",
		"symbol" : "BTC-USDT",
		"margin_mode" : "cross",
		"position" : "long",
		"action" : "buy",
		"order_type" : "limit",
		"price" : 93000.1,
		"size" : 0.1,
		"leverage" : 10,
		"digits" : 2,
		"memo" : null,
		"reduce_only" : 0,
		"broker_id" : null,
		"expiry_time" : "2025-06-13 17:32:56",
		"create_time" : "2025-06-13 17:02:56"
	}
]}

UPDATE
	blofin.account
SET
	total_equity = 68787.471,
	isolated_equity = 0,
	rest_api_url = 'https://demo-trading-openapi.blofin.com',
	wss_url = 'wss://demo-trading-openapi.blofin.com/ws/private',
	wss_public_url = 'wss://demo-trading-openapi.blofin.com/ws/public',
	update_time = FROM_UNIXTIME(1749923286113 / 1000)
WHERE
	account = x'23334e';

select col.table_schema as database_name,
       col.table_name,
       col.ordinal_position as column_id,
       col.column_name,
       col.data_type,
       col.datetime_precision
from information_schema.columns col
join information_schema.tables tab on tab.table_schema = col.table_schema
                                   and tab.table_name = col.table_name
                                   and tab.table_type = 'BASE TABLE'
where col.data_type in ('date', 'time', 'datetime', 'year', 'timestamp')
      and col.table_schema not in ('information_schema', 'sys',
                                   'performance_schema', 'mysql')
     and col.table_schema = 'blofin' -- put your database name here
order by col.table_schema,
         col.table_name,
         col.ordinal_position;




INSERT
	INTO
	blofin.orders (client_order_id,
	instrument_type,
	order_id,
	price,
	size,
	order_type,
	action,
	position,
	margin_mode,
	filled_size,
	filled_amount,
	average_price,
	state,
	leverage,
	fee,
	pnl,
	order_category,
	cancel_source,
	reduce_only,
	broker_id,
	client_order_id,
	create_time,
	update_time)
VALUES (x'7e044a',
x'f6fdee',
1000107635199,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
?,
FROM_UNIXTIME(?/ 1000),
FROM_UNIXTIME(?/ 1000)) ON
DUPLICATE KEY
UPDATE
	client_order_id = ?,
	instrument_type = ?,
	order_id = ?,
	price = ?,
	size = ?,
	order_type = ?,
	action = ?,
	position = ?,
	margin_mode = ?,
	filled_size = ?,
	filled_amount = ?,
	average_price = ?,
	state = ?,
	leverage = ?,
	fee = ?,
	pnl = ?,
	order_category = ?,
	cancel_source = ?,
	reduce_only = ?,
	broker_id = ?,
	create_time = FROM_UNIXTIME(?/ 1000),
	update_time = FROM_UNIXTIME(?/ 1000) [
  <Buffer 7e 04 4a>,
	<Buffer f6 fd ee>,
	'1000107635199',
	93000.1,
	0.1,
	<Buffer 6e b6 c5>,
	'buy',
	'long',
	'cross',
	0,
	0,
	0,
	<Buffer aa 16 01>,
	10,
	0,
	0,
	<Buffer 85 e8 4f>,
	<Buffer 64 56 04>,
	false,
	'',
	undefined,
	1749933548392,
	1749933548402,
	<Buffer 7e 04 4a>,
	<Buffer f6 fd ee>,
	'1000107635199',
	93000.1,
	0.1,
	<Buffer 6e b6 c5>,
	'buy',
	'long',
	'cross',
	0,
	0,
	0,
	<Buffer aa 16 01>,
	10,
	0,
	0,
	<Buffer 85 e8 4f>,
	<Buffer 64 56 04>,
	false,
	'',
	1749933548392,
	1749933548402
]