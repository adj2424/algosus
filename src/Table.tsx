import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';

type props = {
  data: any[];
};

const Table = (props: props) => {
  const { data } = props;
  // header info for table
  const header = [
    {
      field: 'equity',
      headerName: 'equity',
      width: 150
    },
    {
      field: 'date',
      headerName: 'date',
      width: 600
    }
  ];

  return (
    <>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid getRowId={row => row.date} rows={data} columns={header} pageSize={5} rowsPerPageOptions={[5]} />
      </Box>
    </>
  );
};

export default Table;
