import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../utils/r2Client.js";

export const signedUrl = async (nameFile, contentType) => {
	const fileKey = `${randomUUID()}-${nameFile}`;

	const url = await getSignedUrl(
		r2,
		new PutObjectCommand({
			Bucket: process.env.BUCKET_NAME,
			Key: fileKey,
			ContentType: contentType,
		}),
		{ expiresIn: 600 }, // 10 minutos
	);
	return { url };
};
