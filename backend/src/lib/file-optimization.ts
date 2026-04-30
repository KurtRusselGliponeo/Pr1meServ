import path from 'node:path';

type OptimizationInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

type OptimizationResult = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  optimization: {
    attempted: boolean;
    applied: boolean;
    strategy: 'image-lossy' | 'pdf-safe-skip' | 'office-safe-skip' | 'none';
    originalBytes: number;
    optimizedBytes: number;
  };
};

function getExtension(fileName: string) {
  const ext = path.extname(fileName).replace(/^\./, '').toLowerCase();
  return ext || 'bin';
}

export async function optimizeUploadFile(input: OptimizationInput): Promise<OptimizationResult> {
  const extension = getExtension(input.fileName);
  const originalBytes = input.buffer.byteLength;

  if (input.mimeType.startsWith('image/')) {
    try {
      const sharp = (await import('sharp')).default;
      const optimizedBuffer = await sharp(input.buffer)
        .rotate()
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      if (optimizedBuffer.byteLength < originalBytes) {
        return {
          buffer: optimizedBuffer,
          mimeType: 'image/jpeg',
          extension: 'jpg',
          optimization: {
            attempted: true,
            applied: true,
            strategy: 'image-lossy',
            originalBytes,
            optimizedBytes: optimizedBuffer.byteLength,
          },
        };
      }
    } catch {
      // Fall through to original buffer when optimization tooling is unavailable.
    }

    return {
      buffer: input.buffer,
      mimeType: input.mimeType,
      extension,
      optimization: {
        attempted: true,
        applied: false,
        strategy: 'none',
        originalBytes,
        optimizedBytes: originalBytes,
      },
    };
  }

  if (input.mimeType === 'application/pdf') {
    return {
      buffer: input.buffer,
      mimeType: input.mimeType,
      extension,
      optimization: {
        attempted: true,
        applied: false,
        strategy: 'pdf-safe-skip',
        originalBytes,
        optimizedBytes: originalBytes,
      },
    };
  }

  return {
    buffer: input.buffer,
    mimeType: input.mimeType,
    extension,
    optimization: {
      attempted: true,
      applied: false,
      strategy: 'office-safe-skip',
      originalBytes,
      optimizedBytes: originalBytes,
    },
  };
}
