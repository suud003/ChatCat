/**
 * Canvas 2D context mock for testing.
 * Returns an object with a canvas-like element and a mocked 2d context.
 */
import { vi } from 'vitest';

export function createCanvasMock(w = 300, h = 300) {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    roundRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    // Properties
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'start',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
  };

  const canvas = {
    width: w,
    height: h,
    getContext: vi.fn(() => ctx),
  };

  return { canvas, ctx };
}
