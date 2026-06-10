import { randomUUID } from 'node:crypto';
import type { Job, JobStatus } from './types';

// Next.js bundles each route handler separately, so a plain module-level Map is
// NOT shared across routes (upload would create a job that transcribe/render
// cannot see). Anchoring the Map on globalThis makes it a true per-process
// singleton shared by every route, and also survives dev-mode HMR.
const globalForJobs = globalThis as unknown as { __simpleCaptionJobs?: Map<string, Job> };
const jobs: Map<string, Job> = globalForJobs.__simpleCaptionJobs ?? new Map<string, Job>();
globalForJobs.__simpleCaptionJobs = jobs;

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
