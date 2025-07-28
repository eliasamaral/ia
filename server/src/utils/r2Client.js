import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
	region: 'auto',
	endpoint: process.env.CLOUDFLARE_ENDPOINT,
	credentials: {
		accessKeyId: process.env.ACCESS_KEY_ID,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
	},
})
