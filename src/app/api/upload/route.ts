import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf', 'ai']);

function getExt(filename: string): string {
  return (filename.split('.').pop() ?? '').toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = getExt(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'File type not allowed. Upload PNG, JPG, PDF, or AI.' }, { status: 400 });
    }

    // arrayBuffer() returns empty bytes under Next.js 16 + Turbopack;
    // read via the Web Streams API instead.
    const chunks: Uint8Array[] = [];
    const reader = file.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const content = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    if (content.byteLength === 0) {
      return NextResponse.json({ error: 'File appears empty — please try again.' }, { status: 400 });
    }

    const safeName = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, safeName), content);

    return NextResponse.json({
      uploadPath: `/uploads/${safeName}`,
      fileName: file.name,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
