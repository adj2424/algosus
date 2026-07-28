import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import './Table.css';

type props = {
  account: any;
  loading: boolean;
};

type PositionRow = {
  symbol: string;
  current_price: number;
  qty: number;
  profit: string;
};

const Table = (props: props) => {
  const { account, loading } = props;
  const theme = useTheme();
  // Single canonical breakpoint (md/900px) shared with the layout shell,
  // so no viewport band shows a desktop grid squeezed into a mobile column.
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

  const positions: PositionRow[] = useMemo(() => {
    const raw = account.positions ? account.positions : [];
    return raw.map((position: any) => ({
      ...position,
      profit: (position.qty * (position.current_price - position.avg_entry_price)).toFixed(2)
    }));
  }, [account]);

  const header = [
    { field: 'symbol', headerName: 'Name', flex: 1, minWidth: 90 },
    { field: 'current_price', headerName: 'Price', flex: 1, minWidth: 90 },
    { field: 'qty', headerName: 'Shares', flex: 1, minWidth: 90 },
    { field: 'profit', headerName: 'Profit', flex: 1, minWidth: 90 }
  ];

  // Loading and empty are distinct states: account starts as {} on mount,
  // so keying the empty state on positions.length alone would flash
  // "no holdings" during every fetch instead of showing placeholders.
  if (loading) {
    return (
      <Card variant="outlined" className="holdings-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Holdings
          </Typography>
          <Stack spacing={1} aria-label="Holdings loading">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card variant="outlined" className="holdings-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Holdings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No open positions right now.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (isNarrow) {
    return (
      <Card variant="outlined" className="holdings-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Holdings
          </Typography>
          <Stack spacing={1} className="holdings-list" role="list" aria-label="Holdings">
            {positions.map(position => {
              const positive = Number(position.profit) >= 0;
              return (
                <div className="holding-row" role="listitem" key={position.symbol}>
                  <div className="holding-row-main">
                    <span className="holding-symbol">{position.symbol}</span>
                    <span className="holding-qty">
                      {position.qty} sh @ ${Number(position.current_price).toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`holding-profit ${positive ? 'holding-profit--positive' : 'holding-profit--negative'}`}
                  >
                    {positive ? '+' : ''}${position.profit}
                  </span>
                </div>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" className="holdings-card">
      <CardContent className="holdings-grid-content">
        <Typography variant="h6" gutterBottom>
          Holdings
        </Typography>
        <Box className="holdings-grid">
          <DataGrid
            getRowId={(row: any) => row.symbol}
            rows={positions}
            columns={header}
            initialState={{
              pagination: { paginationModel: { pageSize: 15 } }
            }}
            pageSizeOptions={[15]}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default Table;
