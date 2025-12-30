import * as Minio from "minio"
import { Config } from "../config.ts"

export const minioClient = new Minio.Client({
    endPoint: Config.MINIO_ENDPOINT,
    port: Config.MINIO_PORT,
    useSSL: Config.MINIO_USE_SSL,
    accessKey: Config.MINIO_ROOT_USER,
    secretKey: Config.MINIO_ROOT_PASSWORD,
})

export async function ensureBucket() {
    const exists = await minioClient.bucketExists(Config.MINIO_BUCKET)
    if (!exists) {
        await minioClient.makeBucket(Config.MINIO_BUCKET)
        
        // Set public read policy for the bucket so we can access images via URL
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] },
                    Action: ["s3:GetBucketLocation", "s3:ListBucket"],
                    Resource: [`arn:aws:s3:::${Config.MINIO_BUCKET}`],
                },
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] },
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${Config.MINIO_BUCKET}/*`],
                },
            ],
        }
        await minioClient.setBucketPolicy(Config.MINIO_BUCKET, JSON.stringify(policy))
    }
}

export async function uploadFile(file: Buffer | string | any, fileName: string, contentType: string) {
    await ensureBucket()
    const objectName = `${Date.now()}-${fileName}`
    const size = Buffer.isBuffer(file) ? file.length : undefined
    await minioClient.putObject(Config.MINIO_BUCKET, objectName, file, size, {
        "Content-Type": contentType,
    })
    
    return `${Config.MINIO_PUBLIC_URL}/${Config.MINIO_BUCKET}/${objectName}`
}
