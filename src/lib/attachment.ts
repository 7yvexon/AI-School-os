export function attachmentMimeMatchesData(mime: string, data: Uint8Array) {
  if (mime === "application/pdf")
    return (
      data.length >= 5 &&
      new TextDecoder()
        .decode(data.slice(0, 1024))
        .replace(/^\uFEFF/, "")
        .trimStart()
        .startsWith("%PDF-")
    );
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => data[index] === value,
    );
  if (mime === "image/jpeg")
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === "text/plain") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
      return !text.includes("\u0000");
    } catch {}
    if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
      try {
        const text = new TextDecoder("utf-16le", { fatal: true }).decode(
          data.slice(2),
        );
        return !text.includes("\u0000");
      } catch {}
    }
    if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
      const swapped = new Uint8Array(data.length - 2);
      for (let i = 2; i < data.length; i += 2) {
        swapped[i - 2] = data[i + 1] ?? 0;
        swapped[i - 1] = data[i] ?? 0;
      }
      try {
        const text = new TextDecoder("utf-16le", { fatal: true }).decode(
          swapped,
        );
        return !text.includes("\u0000");
      } catch {}
    }
    return false;
  }
  return false;
}
