INSERT INTO
  blofin.positions (
    instrument,
    POSITION,
    size,
    size_available,
    leverage,
    margin_mode,
    margin_used,
    margin_ratio,
    margin_initial,
    margin_maint,
    average_price,
    liquidation_price,
    mark_price,
    unrealized_pnl,
    unrealized_pnl_ratio,
    adl,
    positions,
    create_time,
    update_time
  )
VALUES
  (x'cb42a5', 'short', -100, -100, 10, 'cross', 0, 19.628, 3001.9170465, 195.1246080225, 2.9985, 8.98735357666325, 3.0019, -34.170465, -0.011, 1, x'e8d4a56090', FROM_UNIXTIME(1754495885000/1000), FROM_UNIXTIME(1754495885000/1000));