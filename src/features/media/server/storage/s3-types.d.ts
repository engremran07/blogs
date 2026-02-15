/**
 * Ambient module declaration for `@aws-sdk/client-s3`.
 *
 * The S3 adapter dynamically imports the SDK at runtime so it remains an
 * optional peer dependency.  This declaration prevents TS2307 errors when
 * the package is not installed locally.
 */
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: Record<string, any>);
    send(command: any): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input: Record<string, any>);
  }
  export class GetObjectCommand {
    constructor(input: Record<string, any>);
  }
  export class DeleteObjectCommand {
    constructor(input: Record<string, any>);
  }
  export class HeadObjectCommand {
    constructor(input: Record<string, any>);
  }
  export class CopyObjectCommand {
    constructor(input: Record<string, any>);
  }
  export class ListObjectsV2Command {
    constructor(input: Record<string, any>);
  }
}
