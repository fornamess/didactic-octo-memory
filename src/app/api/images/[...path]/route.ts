import { VIDEO_STORAGE_PATH } from '@/lib/config';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const fileName = pathArray.join('/');

    // Проверяем безопасность пути (предотвращаем path traversal)
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const filePath = path.join(VIDEO_STORAGE_PATH, 'images', fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);

    // Определяем MIME тип по расширению
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
