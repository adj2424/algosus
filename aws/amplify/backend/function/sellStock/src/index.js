import Alpaca from '@alpacahq/alpaca-trade-api';

require('dotenv').config();

const alpaca = new Alpaca({
	keyId: process.env.ALPACA_API_KEY,
	secretKey: process.env.ALPACA_SECRET_KEY,
	paper: true
});

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);
	const portfolio = await alpaca.getPositions();
	let stocks = [];
	//console.log(portfolio[0]);
	await Promise.all(
		portfolio.map(position => {
			console.log(position.symbol, Number(position.qty));
			stocks.push(position.symbol);
			alpaca.createOrder({
				symbol: String(position.symbol),
				qty: Number(position.qty),
				side: 'sell',
				type: 'market',
				time_in_force: 'day'
			});
		})
	);
	//await updateProfile();
	return {
		statusCode: 200,
		//  Uncomment below to enable CORS requests
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': '*'
		},
		body: JSON.stringify('sell all stocks')
	};
}
