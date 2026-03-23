import { Buffer } from "buffer";

// Polyfill Buffer for Solana libraries in the browser
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}
