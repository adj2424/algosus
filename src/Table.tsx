import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import { useState, useEffect } from 'react';

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
		const temp = account.positions ? account.positions : [];
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
			width: 120
		},
		{
			field: 'current_price',
			headerName: 'price',
			width: 120
		},
		{
			field: 'qty',
			headerName: 'quantity',
			width: 120
		},
		{
			field: 'profit',
			headerName: 'profit',
			width: 120
		}
	];

	return (
		<>
			<Box sx={{ height: window.innerHeight * 0.9, width: '100%' }}>
				<DataGrid
					getRowId={(row: any) => row.symbol}
					rows={positions}
					columns={header}
					pageSize={15}
					rowsPerPageOptions={[15]}
				/>
			</Box>
		</>
	);
};

export default Table;
