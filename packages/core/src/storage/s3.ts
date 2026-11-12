import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageProvider } from "./storage.ts";

export function s3Storage(options: {
  bucket: string;
  region: string;
  endpoint?: string;
  publicUrl: string;
  prefix?: string;
}): StorageProvider {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: Boolean(options.endpoint),
  });
  const full = (key: string) => [options.prefix, key].filter(Boolean).join("/");
  const base = options.publicUrl.endsWith("/") ? options.publicUrl : `${options.publicUrl}/`;
  return {
    name: "s3",
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: full(key),
          Body: body,
          ContentType: contentType,
          CacheControl:
            key.endsWith("/manifest.json") || key.endsWith("/index.html")
              ? "no-cache"
              : "public, max-age=31536000, immutable",
        }),
      );
    },
    url: (key) => new URL(full(key), base).href,
  };
}
