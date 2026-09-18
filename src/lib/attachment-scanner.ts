import { createConnection, type Socket } from "node:net";

export type AttachmentScanResult = {
  status: "CLEAN" | "INFECTED" | "UNAVAILABLE" | "ERROR";
  engine: string | null;
};

const SCAN_TIMEOUT_MS = 10000;
const STREAM_CHUNK_BYTES = 64 * 1024;
type ScannerEndpoint = { socketPath: string } | { host: string; port: number };

function configuredEndpoint(): ScannerEndpoint | null {
  const socketPath = process.env.CLAMAV_SOCKET?.trim();
  if (socketPath) return { socketPath };
  const host = process.env.CLAMAV_HOST?.trim();
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port };
}

function resultFromResponse(response: string): AttachmentScanResult {
  const normalized = response.toUpperCase();
  if (normalized.includes("FOUND"))
    return { status: "INFECTED", engine: "clamav" };
  if (normalized.includes(" OK")) return { status: "CLEAN", engine: "clamav" };
  return { status: "ERROR", engine: "clamav" };
}

export async function scanAttachmentData(
  data: Uint8Array,
): Promise<AttachmentScanResult> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_TEST_MODE === "true"
  )
    return { status: "CLEAN", engine: "e2e" };
  const endpoint = configuredEndpoint();
  if (!endpoint) return { status: "UNAVAILABLE", engine: null };

  return new Promise((resolve) => {
    const socket: Socket =
      "socketPath" in endpoint
        ? createConnection(endpoint.socketPath)
        : createConnection(endpoint.port, endpoint.host);
    let response = "";
    let settled = false;
    const finish = (result: AttachmentScanResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.destroy();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ status: "ERROR", engine: "clamav" }),
      SCAN_TIMEOUT_MS,
    );
    const connectError = () => finish({ status: "ERROR", engine: "clamav" });
    socket.setTimeout(SCAN_TIMEOUT_MS, connectError);
    socket.once("error", connectError);
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (response.includes("FOUND") || response.includes(" OK"))
        finish(resultFromResponse(response));
    });
    socket.once("connect", () => {
      try {
        socket.write(Buffer.from("zINSTREAM\0", "ascii"));
        for (
          let offset = 0;
          offset < data.byteLength;
          offset += STREAM_CHUNK_BYTES
        ) {
          const chunk = data.subarray(
            offset,
            Math.min(offset + STREAM_CHUNK_BYTES, data.byteLength),
          );
          const length = Buffer.allocUnsafe(4);
          length.writeUInt32BE(chunk.byteLength, 0);
          socket.write(length);
          socket.write(chunk);
        }
        const end = Buffer.alloc(4);
        socket.write(end);
      } catch {
        connectError();
      }
    });
  });
}
