export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side instrumentation
    // OpenTelemetry / Vercel tracing can be configured here
    // e.g. const { NodeSDK } = await import('@opentelemetry/sdk-node');
  }
}
