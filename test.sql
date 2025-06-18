CREATE
OR
REPLACE
  vw_positions AS
SELECT
  p.position_id AS position_id,
  i.instrument AS instrument,
  CONCAT(b.symbol, '-', q.symbol) AS symbol,
  POSITION AS positon,
  IF(p.positions>0, 'buy', 'sell') AS ACTION,
  it.source_ref AS instrument_type,
  p.margin_mode AS margin_mode,
  p.leverage AS leverage,
  p.positions AS positions,
  p.available_positions AS available_positions,
  p.average_price AS average_price,
  p.mark_price AS mark_price,
  p.margin_ratio AS margin_ratio,
  p.liquidation_price AS liquidation_price,
  p.unrealized_pnl AS unrealized_pnl,
  p.unrealized_pnl_ratio AS unrealized_pnl_ratio,
  p.initial_margin AS initial_margin,
  p.maintenance_margin AS maintenance_margin,
  p.create_time AS create_time,
  p.update_time AS update_time
FROM
  blofin.positions p
  JOIN blofin.instrument i
  JOIN blofin.instrument_type i
  JOIN blofin.currency b
  JOIN blofin.currency q
WHERE
  p.instrument=i.instrument
  AND p.instrument_type=it.instrument_type
  AND i.base_currency=b.currency
  AND i.quote_currency=q.currency