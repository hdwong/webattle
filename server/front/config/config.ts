import { ClientConfig } from "pg";
import { RedisClientOptions } from "redis";
import { ServerOptions as WssServerOptions } from "ws";

export default {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'webattle',
    user: 'bun',
    password: '',
  } as ClientConfig,

  redis: {
    url: 'redis://localhost:6379',
  } as RedisClientOptions,

  login: {
    api: {
      port: 9000,
    }
  },

  gateway: {
    wss: {
      host: 'localhost',
      port: 9001,
      perMessageDeflate: {
        zlibDeflateOptions: {
          // See zlib defaults.
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
      }
    } as WssServerOptions,
    io: {
      host: 'localhost',
      port: 9001,
    }
  }
}
