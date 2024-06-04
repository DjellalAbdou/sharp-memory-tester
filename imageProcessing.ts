import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import { parentPort, workerData } from 'worker_threads';

const imageDir = './images';
export interface TMemoryUsageData extends Omit<NodeJS.MemoryUsage, 'arrayBuffers'> {
  file: string;
}

export async function processImage(file: string): Promise<TMemoryUsageData | null> {
  try {
    const inputPath = path.join(imageDir, file);
    const outputPath = path.join('output', file);
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);

    const fileStats = fs.statSync(inputPath);
    console.log(`Processing ${file}, size: ${fileStats.size}`);
    await pipeline(readStream, sharp().resize(200).toFormat('png'), writeStream);

    const memoryUsage = process.memoryUsage();
    console.log(
      `Memory usage: ${memoryUsage.rss} bytes, Heap total: ${memoryUsage.heapTotal} bytes, Heap used: ${memoryUsage.heapUsed} bytes, external: ${memoryUsage.external} bytes`,
    );

    return {
      file,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
    };
  } catch (error) {
    console.log(`error here ${error}`);
    return null;
  }
}

processImage(workerData as string).then((data) => parentPort?.postMessage(data));
