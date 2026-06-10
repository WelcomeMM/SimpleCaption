import { describe, it, expect } from 'vitest';
import { createJob, getJob, setStatus } from './jobs';

describe('job store', () => {
  it('creates and retrieves a job', () => {
    const j = createJob({ sourceFile: '/x/a.mp4', sourceExt: 'mp4', isAudioOnly: false });
    expect(getJob(j.id)?.status).toBe('uploaded');
  });
  it('transitions status', () => {
    const j = createJob({ sourceFile: '/x/a.mp4', sourceExt: 'mp4', isAudioOnly: false });
    setStatus(j.id, 'ready', { durationInSeconds: 5 });
    expect(getJob(j.id)?.status).toBe('ready');
    expect(getJob(j.id)?.durationInSeconds).toBe(5);
  });
});
