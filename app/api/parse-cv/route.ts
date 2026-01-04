import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "extract_cv.py");
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

type ParserPayload = {
  text?: string;
  name?: string;
  error?: string;
};

const runPythonParser = (filePath: string) =>
  new Promise<ParserPayload>((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [SCRIPT_PATH, filePath]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr || stdout || `Python parser exited with status ${code}`
          )
        );
        return;
      }

      try {
        const payload = JSON.parse(stdout) as ParserPayload;
        resolve(payload);
      } catch (error) {
        reject(new Error("Failed to parse PyPDF2 output."));
      }
    });
  });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing file payload." },
        { status: 400 }
      );
    }

    const fileName =
      (file as File).name?.trim() || `cv-${Date.now()}.pdf`;

    const dir = await mkdtemp(path.join(tmpdir(), "omnifaind-cv-"));
    const tempFile = path.join(dir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFile, buffer);

    try {
      const payload = await runPythonParser(tempFile);
      if (payload.error) {
        throw new Error(payload.error);
      }
      if (!payload.text) {
        throw new Error("PDF parsing returned empty text.");
      }
      return NextResponse.json(payload);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Failed to parse CV file", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while parsing CV.",
      },
      { status: 500 }
    );
  }
}
