export type Position = {
  asset_class: string;
  asset_id: string;
  asset_marginable: boolean;
  avg_entry_price: number;
  change_today: number;
  cost_basis: number;
  current_price: number;
  exchange: string;
  lastday_price: number;
  market_value: number;
  maintenance_margin: number;
  qty: number;
  qty_available: number;
  side: string;
  symbol: string;
  unrealized_intraday_pl: number;
  unrealized_intraday_plpc: number;
  unrealized_pl: number;
  unrealized_plpc: number;
};

export type Response = {
  account: {
    current_equity: number;
    initial_equity: number;
    last_equity: number;
    positions: Position[];
  };

  timeline: {
    [key: string]: {
      equity: number;
      date: string;
    };
  };
};
