import Busboy from "busboy";
import { Readable } from "node:stream";

export type ParsedFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};

export type ParsedMultipart = {
  fields: Record<string, string>;
  file?: ParsedFile;
};

export const parseMultipart = async (
  req: Request,
  opts: { maxFileSize: number }
): Promise<ParsedMultipart> => {
  if (!req.body) {
    throw new Error("missing_body");
  }
  const contentType = req.headers.get("content-type");
  if (!contentType) {
    throw new Error("missing_content_type");
  }

  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: { "content-type": contentType },
      limits: {
        files: 1,
        fileSize: opts.maxFileSize
      }
    });

    const fields: Record<string, string> = {};
    let fileData: ParsedFile | undefined;
    let sizeExceeded = false;

    bb.on("file", (_name, file, info) => {
      const chunks: Buffer[] = [];
      let total = 0;

      file.on("data", (data: Buffer) => {
        total += data.length;
        chunks.push(data);
      });

      file.on("limit", () => {
        sizeExceeded = true;
        file.resume();
      });

      file.on("end", () => {
        fileData = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
          size: total
        };
      });
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("error", (err) => reject(err));

    bb.on("finish", () => {
      if (sizeExceeded) {
        reject(new Error("file_too_large"));
        return;
      }
      resolve({ fields, file: fileData });
    });

    Readable.fromWeb(req.body as ReadableStream).pipe(bb);
  });
};
