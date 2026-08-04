import type { LearningProgressState, LearningStatus, LessonTab } from './types';

export const LEARNING_PROGRESS_KEY = 'jarvis.learn.progress.v1';

export const EMPTY_LEARNING_PROGRESS: LearningProgressState = {
  topics: {},
  developerUnlock: false,
};

export function readLearningProgress(): LearningProgressState {
  if (typeof window === 'undefined') return EMPTY_LEARNING_PROGRESS;
  try {
    const raw = window.localStorage.getItem(LEARNING_PROGRESS_KEY);
    if (!raw) return EMPTY_LEARNING_PROGRESS;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_LEARNING_PROGRESS;
    const record = value as Partial<LearningProgressState>;
    return {
      currentTopic: typeof record.currentTopic === 'string' ? record.currentTopic : undefined,
      lastTopic: typeof record.lastTopic === 'string' ? record.lastTopic : undefined,
      developerUnlock: record.developerUnlock === true,
      topics: record.topics && typeof record.topics === 'object' && !Array.isArray(record.topics) ? record.topics : {},
    };
  } catch {
    return EMPTY_LEARNING_PROGRESS;
  }
}

export function writeLearningProgress(progress: LearningProgressState) {
  if (typeof window !== 'undefined') window.localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(progress));
}

export function statusLabel(status: LearningStatus) {
  return status === 'not-started' ? 'Not Started' : status === 'in-progress' ? 'In Progress' : 'Completed';
}

export function defaultTopicProgress(status: LearningStatus = 'not-started') {
  return { status, completedTabs: [] as LessonTab[], lastOpenedAt: new Date().toISOString() };
}
