import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { TMemoryUsageData } from './imageProcessing';

const imageDir = './images';
const processImages = async () => {
  const memoryUsageData: TMemoryUsageData[] = [];
  const files = fs.readdirSync(imageDir);
  const promessArray = [];
  for (const file of files) {
    promessArray.push(
      new Promise((resolve, reject) => {
        const worker = new Worker('./imageProcessing.ts', { workerData: file });
        worker.on('message', (data: TMemoryUsageData) => {
          const md = process.memoryUsage();
          memoryUsageData.push({
            file,
            heapTotal: md.heapTotal,
            heapUsed: md.heapUsed,
            rss: md.rss,
            external: md.external,
          });

          resolve(data);
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
      }),
    );
  }
  const results = await Promise.all(promessArray);
  return { results, memoryUsageData };
};

async function plotChart(memoryUsageData: any[], name: string = 'memoryUsageChart.png') {
  const { files, rss, external, heapTotal, heapUsed } = memoryUsageData.reduce(
    (acc, current) => {
      acc.files.push(current.file);
      acc.rss.push(current.rss / (1024 * 1024));
      acc.heapTotal.push(current.heapTotal / (1024 * 1024));
      acc.heapUsed.push(current.heapUsed / (1024 * 1024));
      acc.external.push(current.external / (1024 * 1024));
      return acc;
    },
    { files: [], rss: [], heapTotal: [], heapUsed: [], external: [] },
  );

  const width = 800;
  const height = 600;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const configuration = {
    type: 'line',
    data: {
      labels: files,
      datasets: [
        { label: 'RSS (MB)', data: rss, borderColor: 'red', fill: false },
        { label: 'Heap Total (MB)', data: heapTotal, borderColor: 'blue', fill: false },
        { label: 'Heap Used (MB)', data: heapUsed, borderColor: 'green', fill: false },
        { label: 'External (MB)', data: external, borderColor: 'orange', fill: false },
      ],
    },
    options: {
      responsive: true,
      title: {
        display: true,
        text: 'Memory Usage During Image Processing',
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Processed Files',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Memory Usage (MB)',
          },
        },
      },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration as any);
  fs.writeFileSync(path.join('data', name), image);
}

async function main() {
  try {
    const data = await processImages();
    await plotChart(data.memoryUsageData, 'memoryUsageChart-from-master.png');
    await plotChart(data.results, 'memoryUsageData-from-workers.png');
  } catch (error) {
    console.log(error);
  }
}

main()
  .then(() => {})
  .catch((err) => {});
