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
	constructor(private options: { 
		bucket: string; 
		region: string; 
		endpoint?: string;
		credentials: { accessKeyId: string; secretAccessKey: string }
	}) {}

	async upload(params: { file: File | Blob; path: string; filename?: string }) {
		// Implementation using @aws-sdk/client-s3
		return { url: "", key: "", size: 0 };
	}

	async delete(key: string) {
		// S3 Delete
	}

	async getSignedUrl(key: string) {
		// S3 GetObject with signing
		return "";
	}
}
