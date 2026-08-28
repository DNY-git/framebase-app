import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crop, Undo2, X } from './icons';

const MIN_CROP = 48;

export interface ImageEditorProps {
  src: string;
  title?: string;
  aspect?: number;
  outputSize?: number;
  onCancel: () => void;
  onApply: (blob: Blob, mimeType: string) => void;
}

type CropRect = { x: number; y: number; size: number };
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export function ImageEditor({
  src,
  title = 'Edit image',
  aspect = 1,
  outputSize = 512,
  onCancel,
  onApply,
}: ImageEditorProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    corner?: ResizeCorner;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const stageSize = useMemo(
    () => (aspect >= 1 ? { width: 320, height: Math.round(320 / aspect) } : { width: Math.round(320 * aspect), height: 320 }),
    [aspect],
  );

  const imageRect = useMemo(() => {
    if (!natural) return null;
    const scale = Math.min(stageSize.width / natural.width, stageSize.height / natural.height);
    const width = natural.width * scale;
    const height = natural.height * scale;
    return { x: (stageSize.width - width) / 2, y: (stageSize.height - height) / 2, width, height };
  }, [natural, stageSize]);

  const maxCropSize = useMemo(
    () => (imageRect ? Math.min(imageRect.width, imageRect.height * aspect) : 0),
    [imageRect, aspect],
  );

  useEffect(() => {
    if (!imageRect || crop) return;
    const size = maxCropSize;
    setCrop({
      x: imageRect.x + (imageRect.width - size) / 2,
      y: imageRect.y + (imageRect.height - size / aspect) / 2,
      size,
    });
  }, [imageRect, maxCropSize, aspect, crop]);

  const clampCrop = useCallback(
    (c: CropRect): CropRect => {
      if (!imageRect) return c;
      const size = Math.min(Math.max(MIN_CROP, c.size), maxCropSize);
      const width = size;
      const height = size / aspect;
      const maxX = imageRect.x + imageRect.width - width;
      const maxY = imageRect.y + imageRect.height - height;
      return {
        x: Math.min(maxX, Math.max(imageRect.x, c.x)),
        y: Math.min(maxY, Math.max(imageRect.y, c.y)),
        size,
      };
    },
    [imageRect, maxCropSize, aspect],
  );

  const reset = useCallback(() => {
    if (!imageRect) return;
    const size = maxCropSize;
    setCrop({
      x: imageRect.x + (imageRect.width - size) / 2,
      y: imageRect.y + (imageRect.height - size / aspect) / 2,
      size,
    });
  }, [imageRect, maxCropSize, aspect]);

  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'resize', corner?: ResizeCorner) => {
    if (!crop) return;
    e.preventDefault();
    stageRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { mode, corner, startX: e.clientX, startY: e.clientY, startCrop: crop };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const start = drag.startCrop;

    if (drag.mode === 'move') {
      setCrop(clampCrop({ x: start.x + dx, y: start.y + dy, size: start.size }));
      return;
    }

    const corner = drag.corner ?? 'se';
    let size = start.size;
    let x = start.x;
    let y = start.y;
    switch (corner) {
      case 'se':
        size += (dx + dy) / 2;
        break;
      case 'nw':
        size -= (dx + dy) / 2;
        x = start.x + start.size - size;
        y = start.y + start.size / aspect - size / aspect;
        break;
      case 'ne':
        size += (dx - dy) / 2;
        y = start.y + start.size / aspect - size / aspect;
        break;
      case 'sw':
        size += (dy - dx) / 2;
        x = start.x + start.size - size;
        break;
    }
    setCrop(clampCrop({ x, y, size }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const apply = () => {
    const img = imageRef.current;
    const rect = imageRect;
    const box = crop;
    if (!img || !rect || !box) return;
    setIsExporting(true);

    const sx = (box.x - rect.x) * (natural!.width / rect.width);
    const sy = (box.y - rect.y) * (natural!.height / rect.height);
    const sWidth = box.size * (natural!.width / rect.width);
    const sHeight = (box.size / aspect) * (natural!.height / rect.height);

    const out = document.createElement('canvas');
    out.width = outputSize;
    out.height = Math.round(outputSize / aspect);
    const ctx = out.getContext('2d');
    if (!ctx) {
      setIsExporting(false);
      return;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, out.width, out.height);

    const isPng = /png|webp/i.test(src);
    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    out.toBlob(
      (blob) => {
        setIsExporting(false);
        if (blob) onApply(blob, mimeType);
      },
      mimeType,
      isPng ? undefined : 0.92,
    );
  };

  const cornerStyle = (corner: ResizeCorner): React.CSSProperties => ({
    left: corner.includes('w') ? 0 : '100%',
    top: corner.includes('n') ? 0 : '100%',
    transform: 'translate(-50%, -50%)',
  });

  const cornerCursor = (corner: ResizeCorner): string =>
    corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Crop className="h-4 w-4 text-foreground-muted" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close editor"
            className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div
            ref={stageRef}
            className="relative mx-auto overflow-hidden rounded-lg border border-border bg-black"
            style={{ width: stageSize.width, height: stageSize.height, touchAction: 'none' }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {src && (
              <img
                ref={imageRef}
                src={src}
                alt=""
                draggable={false}
                decoding="async"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setNatural({ width: img.naturalWidth, height: img.naturalHeight });
                }}
                onError={() => setLoadError(true)}
                className="absolute select-none"
                style={
                  natural && imageRect
                    ? { left: imageRect.x, top: imageRect.y, width: imageRect.width, height: imageRect.height }
                    : { opacity: 0 }
                }
              />
            )}
            {natural && imageRect && crop && (
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                    className="absolute cursor-move border-2 border-white/90"
                    style={{
                      left: crop.x,
                      top: crop.y,
                      width: crop.size,
                      height: crop.size / aspect,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                    }}
                  >
                    {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                      <span
                        key={corner}
                        aria-hidden
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handlePointerDown(e, 'resize', corner);
                        }}
                        className={`absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-black/70 ${cornerCursor(corner)}`}
                        style={cornerStyle(corner)}
                      />
                    ))}
                  </div>
                )}
            {!natural && !loadError && (
              <div className="flex h-full items-center justify-center text-sm text-foreground-muted">Loading…</div>
            )}
            {loadError && (
              <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
                Could not load image
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              aria-label="Reset crop"
              className="rounded-lg border border-border p-2 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-foreground-muted">
            Drag the square to reposition · drag a corner to resize the crop
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting || !natural}
            onClick={apply}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-action px-4 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
          >
            {isExporting ? 'Applying…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}