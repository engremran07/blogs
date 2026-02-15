import "server-only";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

function createEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    module,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function createLogger(module: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => {
      const entry = createEntry("info", module, message, data);
      console.log(JSON.stringify(entry));
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      const entry = createEntry("warn", module, message, data);
      console.warn(JSON.stringify(entry));
    },
    error: (message: string, data?: Record<string, unknown>) => {
      const entry = createEntry("error", module, message, data);
      console.error(JSON.stringify(entry));
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === "development") {
        const entry = createEntry("debug", module, message, data);
        console.debug(JSON.stringify(entry));
      }
    },
  };
}
