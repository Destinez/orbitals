'use strict';

const { PNG } = require('pngjs');
const fs = require('fs');

/**
 * A flat RGBA pixel buffer, written by hand — never via
 * CanvasRenderingContext2D (which differs across browser engines /
 * node-canvas in antialiasing and blend-mode math).
 */
class PixelBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.data.fill(255); // opaque white default
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = r;
    this.data[idx + 1] = g;
    this.data[idx + 2] = b;
    this.data[idx + 3] = a;
  }

  getPixel(x, y) {
    const idx = (y * this.width + x) * 4;
    return [this.data[idx], this.data[idx + 1], this.data[idx + 2], this.data[idx + 3]];
  }

  /** Deterministic write to disk — pngjs does raw deflate of the given
   *  byte buffer, no rasterization or resampling involved. */
  toPNGFile(outPath) {
    const png = new PNG({ width: this.width, height: this.height });
    png.data = Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outPath);
      png.pack().pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}

module.exports = { PixelBuffer };
