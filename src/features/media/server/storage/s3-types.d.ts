/**
 * Ambient module declaration for `@aws-sdk/client-s3`.
 *
 * The S3 adapter dynamically imports the SDK at runtime so it remains an
 * optional peer dependency.  This declaration prevents TS2307 errors when
 * the package is not installed locally.
 */
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class PutObjectCommand {
    constructor(input: { Bucket: string; Key: string; Body?: Uint8Array | ReadableStream | Blob | string; ContentType?: string; Metadata?: Record<string, string>; [key: string]: unknown });
  }
  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string; [key: string]: unknown });
  }
  export class DeleteObjectCommand {
    constructor(input: { Bucket: string; Key: string; [key: string]: unknown });
  }
  export class HeadObjectCommand {
    constructor(input: { Bucket: string; Key: string; [key: string]: unknown });
  }
  export class CopyObjectCommand {
    constructor(input: { Bucket: string; Key: string; CopySource: string; [key: string]: unknown });
  }
  export class ListObjectsV2Command {
    constructor(input: { Bucket: string; Prefix?: string; [key: string]: unknown });
  }
}
