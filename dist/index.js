"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chartjs_node_canvas_1 = require("chartjs-node-canvas");
const promises_1 = require("stream/promises");
const imageDir = './images';
async function processImage() {
    const memoryUsageData = [];
    const files = fs_1.default.readdirSync(imageDir);
    for (const file of files) {
        try {
            const inputPath = path_1.default.join(imageDir, file);
            const outputPath = path_1.default.join('output', file);
            const readStream = fs_1.default.createReadStream(inputPath);
            const writeStream = fs_1.default.createWriteStream(outputPath);
            const fileStats = fs_1.default.statSync(inputPath);
            console.log(`Processing ${file}, size: ${fileStats.size}`);
            await (0, promises_1.pipeline)(readStream, (0, sharp_1.default)().resize(200).toFormat('png'), writeStream);
            const memoryUsage = process.memoryUsage();
            console.log(`Memory usage: ${memoryUsage.rss} bytes, Heap total: ${memoryUsage.heapTotal} bytes, Heap used: ${memoryUsage.heapUsed} bytes`);
            memoryUsageData.push({
                file,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                rss: memoryUsage.rss,
                external: memoryUsage.external,
            });
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }
        catch (error) {
            console.log(error);
        }
    }
    for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 1000);
        });
        const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
        memoryUsageData.push({
            file: `timeout-test-${i + 1}`,
            heapTotal,
            heapUsed,
            rss,
            external,
        });
    }
    return memoryUsageData;
}
async function plotChart(memoryUsageData) {
    const { files, rss, external, heapTotal, heapUsed } = memoryUsageData.reduce((acc, current) => {
        acc.files.push(current.file);
        acc.rss.push(current.rss / (1024 * 1024));
        acc.heapTotal.push(current.heapTotal / (1024 * 1024));
        acc.heapUsed.push(current.heapUsed / (1024 * 1024));
        acc.external.push(current.external / (1024 * 1024));
        return acc;
    }, { files: [], rss: [], heapTotal: [], heapUsed: [], external: [] });
    const width = 800;
    const height = 600;
    const chartJSNodeCanvas = new chartjs_node_canvas_1.ChartJSNodeCanvas({ width, height });
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
    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs_1.default.writeFileSync('memoryUsageChart-stream.png', image);
}
async function main() {
    try {
        const data = await processImage();
        await plotChart(data);
    }
    catch (error) {
        console.log(error);
    }
}
main()
    .then(() => { })
    .catch((err) => { });
