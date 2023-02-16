import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import React, { useState, useEffect } from 'react';

type props = {
  account: any;
};

const Table = (props: props) => {
  const { account } = props;
  const [rendered, setRendered] = useState(false);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    // skips first render
    if (!rendered) {
      setRendered(true);
      return;
    }
    const temp = account.positions;
    temp.map((position: any) => {
      position.profit = (position.qty * (position.current_price - position.avg_entry_price)).toFixed(2);
    });
    setPositions(temp);
  }, [account]);

  // header info for table
  const header = [
    {
      field: 'symbol',
      headerName: 'Name',
      width: 150
    },
    {
      field: 'current_price',
      headerName: 'price',
      width: 150
    },
    {
      field: 'qty',
      headerName: 'quantity',
      width: 150
    },
    {
      field: 'profit',
      headerName: 'profit',
      width: 600
    }
  ];

  return (
    <>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          getRowId={(row: any) => row.symbol}
          rows={positions}
          columns={header}
          pageSize={10}
          rowsPerPageOptions={[10]}
        />
      </Box>
    </>
  );
};

export default Table;
