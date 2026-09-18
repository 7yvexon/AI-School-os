import { MAX_ATTACHMENT_BYTES } from "./limits";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function asciiAt(data: Uint8Array, offset: number, value: string) {
  return [...value].every(
    (character, index) => data[offset + index] === character.charCodeAt(0),
  );
}

function uint32At(data: Uint8Array, offset: number) {
  return (
    (((data[offset] ?? 0) << 24) |
      ((data[offset + 1] ?? 0) << 16) |
      ((data[offset + 2] ?? 0) << 8) |
      (data[offset + 3] ?? 0)) >>>
    0
  );
}

function pngMatchesData(data: Uint8Array) {
  if (
    data.length < 33 ||
    !PNG_SIGNATURE.every((value, index) => data[index] === value) ||
    uint32At(data, 8) !== 13 ||
    !asciiAt(data, 12, "IHDR")
  )
    return false;
  return uint32At(data, 16) > 0 && uint32At(data, 20) > 0;
}

function isJpegSofMarker(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function jpegMatchesData(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return false;
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) return false;
    while (data[offset] === 0xff) offset++;
    if (offset >= data.length) return false;
    const marker = data[offset++];
    if (
      marker === 0x00 ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0xda
    )
      return false;
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;
    if (offset + 2 > data.length) return false;
    const length = (data[offset] << 8) | data[offset + 1];
    if (length < 2 || offset + length > data.length) return false;
    if (isJpegSofMarker(marker)) {
      if (length < 8) return false;
      const height = (data[offset + 3] << 8) | data[offset + 4];
      const width = (data[offset + 5] << 8) | data[offset + 6];
      return width > 0 && height > 0;
    }
    offset += length;
  }
  return false;
}

function textMatchesData(data: Uint8Array) {
  if (!data.length) return false;
  const isText = (value: string) => {
    if (!value.length) return false;
    for (const character of value) {
      const code = character.codePointAt(0)!;
      if (
        (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
        code === 0x7f ||
        (code >= 0x80 && code <= 0x9f)
      )
        return false;
    }
    return true;
  };
  try {
    return isText(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch {}
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    try {
      return isText(
        new TextDecoder("utf-16le", { fatal: true }).decode(data.slice(2)),
      );
    } catch {}
  }
  if (
    data.length >= 2 &&
    data[0] === 0xfe &&
    data[1] === 0xff &&
    (data.length - 2) % 2 === 0
  ) {
    const swapped = new Uint8Array(data.length - 2);
    for (let i = 2; i < data.length; i += 2) {
      swapped[i - 2] = data[i + 1]!;
      swapped[i - 1] = data[i]!;
    }
    try {
      return isText(
        new TextDecoder("utf-16le", { fatal: true }).decode(swapped),
      );
    } catch {}
  }
  return false;
}

export function attachmentDataSizeAllowed(data: Uint8Array) {
  return data.byteLength >= 1 && data.byteLength <= MAX_ATTACHMENT_BYTES;
}

export function sanitizeAttachmentName(name: unknown) {
  if (typeof name !== "string") return null;
  const sanitized = name
    .slice(0, 200)
    .normalize("NFC")
    .replace(/[\uD800-\uDFFF]/g, "_")
    .replace(/[\\/\u0000-\u001F\u007F]/g, "_")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
  if (!sanitized || sanitized === "." || sanitized === "..") return null;
  return sanitized;
}

export function attachmentContentDisposition(name: string) {
  const safeName = sanitizeAttachmentName(name) ?? "download";
  const fallback =
    safeName
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/[\r\n]/g, "_")
      .slice(0, 120) || "download";
  const encoded = encodeURIComponent(safeName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function attachmentMimeMatchesData(mime: string, data: Uint8Array) {
  if (mime === "application/pdf")
    return (
      data.length >= 8 &&
      asciiAt(data, 0, "%PDF-") &&
      data[5]! >= 0x30 &&
      data[5]! <= 0x39 &&
      data[6] === 0x2e &&
      data[7]! >= 0x30 &&
      data[7]! <= 0x39
    );
  if (mime === "image/png") return pngMatchesData(data);
  if (mime === "image/jpeg") return jpegMatchesData(data);
  if (mime === "text/plain") return textMatchesData(data);
  return false;
}
