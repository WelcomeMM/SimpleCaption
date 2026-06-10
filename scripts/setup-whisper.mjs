import { installWhisperCpp, downloadWhisperModel } from '@remotion/install-whisper-cpp';
import path from 'node:path';

const to = path.join(process.cwd(), 'data', 'whisper');
const model = process.env.WHISPER_MODEL ?? 'small';
const version = '1.5.5';

console.log(`Installing whisper.cpp ${version} -> ${to}`);
await installWhisperCpp({ to, version });
console.log(`Downloading model ${model}`);
await downloadWhisperModel({ model, folder: to });
console.log('Whisper ready.');
