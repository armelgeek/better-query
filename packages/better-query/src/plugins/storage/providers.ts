import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Interface for File Storage Providers
 */
export interface StorageProvider {
	upload(params: {
		file: File | Blob;
		path: string;
		filename?: string;
	}): Promise<{ url: string; key: string; size: number }>;

	delete(key: string): Promise<void>;

	getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

/**
 * Local File System Storage Provider
 */
export class LocalStorageProvider implements StorageProvider {
	constructor(private options: { baseDir: string; baseUrl: string }) {}

	async upload(params: { file: File | Blob; path: string; filename?: string }) {
		// Simplified implementation for the demo
		const filename = params.filename || `file-${Date.now()}`;
		const key = `${params.path}/${filename}`;
		const url = `${this.options.baseUrl}/${key}`;

		return { url, key, size: (params.file as any).size || 0 };
	}

	async delete(key: string) {
		// Delete from local FS
	}

	async getSignedUrl(key: string) {
		return `${this.options.baseUrl}/${key}`;
	}
}

/**
 * S3 / Cloudflare R2 Storage Provider
 */
export class S3StorageProvider implements StorageProvider {
	protected s3Client: S3Client;
	protected bucket: string;

	constructor(
		protected options: {
			bucket: string;
			region?: string;
			endpoint?: string;
			credentials: { accessKeyId: string; secretAccessKey: string };
			forcePathStyle?: boolean;
		},
	) {
		this.bucket = options.bucket;
		this.s3Client = new S3Client({
			endpoint: options.endpoint,
			region: options.region || "us-east-1",
			credentials: options.credentials,
			forcePathStyle: options.forcePathStyle ?? true,
		});
	}

	async upload(params: { file: File | Blob; path: string; filename?: string }) {
		const filename = params.filename || `file-${Date.now()}`;
		const key = `${params.path}/${filename}`;
		
		const buffer = Buffer.from(await params.file.arrayBuffer());

		await this.s3Client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: buffer,
				ContentType: params.file.type,
			}),
		);

		const endpointUrl = this.options.endpoint || `https://s3.${this.options.region || "us-east-1"}.amazonaws.com`;
		const url = `${endpointUrl}/${this.bucket}/${key}`;

		return {
			url,
			key,
			size: params.file.size,
		};
	}

	async delete(key: string) {
		await this.s3Client.send(
			new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: key,
			}),
		);
	}

	async getSignedUrl(key: string, expiresIn = 3600) {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: key,
		});
		return getSignedUrl(this.s3Client, command, { expiresIn });
	}
}

/**
 * MinIO Storage Provider (Extends S3StorageProvider with MinIO defaults)
 */
export class MinioStorageProvider extends S3StorageProvider {
	constructor(options: {
		bucket: string;
		endpoint: string;
		credentials: { accessKeyId: string; secretAccessKey: string };
		region?: string;
	}) {
		super({
			bucket: options.bucket,
			endpoint: options.endpoint,
			credentials: options.credentials,
			region: options.region || "us-east-1",
			forcePathStyle: true,
		});
	}
}
