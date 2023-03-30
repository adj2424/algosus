const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1', accessKeyId: 'your-access-key', secretAccessKey: 'your-secret-key' });
const db = new AWS.DynamoDB();

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async event => {
	//console.log(`EVENT: ${JSON.stringify(event)}`);
	const params = {
		TableName: 'algosus-dev'
	};

	const data = await db.scan(params).promise();

	console.log(data.Items);
	return {
		statusCode: 200,
		//  Uncomment below to enable CORS requests
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': '*'
		},
		body: data.Items
	};
};
