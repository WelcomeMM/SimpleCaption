import { randomUUID } from 'node:crypto';
import type { Job, JobStatus } from './types';

const jobs = new Map<string, Job>();

export function createJob(init: Pick<Job, 'sourceFile' | 'sourceExt' | 'isAudioOnly'>): Job {
  const job: Job = {
    id: randomUUID().replace(/-/g, ''),
    status: 'uploaded',
    sourceFile: init.sourceFile,
    sourceExt: init.sourceExt,
    isAudioOnly: init.isAudioOnly,
    width: 1080, height: 1920, fps: 30, durationInSeconds: 0,
    captions: [], renderProgress: 0, createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined { return jobs.get(id); }

export function updateJob(id: string, patch: Partial<Job>): Job {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  const next = { ...job, ...patch };
  jobs.set(id, next);
  return next;
}

export function setStatus(id: string, status: JobStatus, extra: Partial<Job> = {}): Job {
  return updateJob(id, { status, ...extra });
}
