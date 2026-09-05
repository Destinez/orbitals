import { useEffect, useRef } from 'react';
import { useMotionValueEvent, type MotionValue } from 'motion/react';
import { renderPlateRGBA } from '../../lib/resonance';

interface Props {
  seed: string;
  colorSeed?: string;
  progress: MotionValue<number>;
  active?: boolean;
}

/** Draws the faithful plate in scroll-driven increments. */
export default function ProgressivePlate({ seed, colorSeed, progress, active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const bucketRef = useRef(-1);

  const draw = (value: number): void => {
    const bucket = Math.max(0, Math.min(48, Math.round(value * 48)));
    if (bucket === bucketRef.current || !active) return;
    bucketRef.current = bucket;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      const plate = renderPlateRGBA(seed, {
        colorSeed,
        progress: bucket / 48,
        background: 'transparent',
      });
      canvas.width = plate.size;
      canvas.height = plate.size;
      context.putImageData(new ImageData(plate.data, plate.size, plate.size), 0, 0);
    });
  };

  useMotionValueEvent(progress, 'change', draw);

  useEffect(() => {
    bucketRef.current = -1;
    draw(progress.get());
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [seed, colorSeed, active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="mx-auto block aspect-square h-auto w-full max-w-[82vh] mix-blend-lighten"
    />
  );
}
