export type LearningStatus = 'not-started' | 'in-progress' | 'completed';

export type LessonTab =
  | 'overview'
  | 'how-it-works'
  | 'playground'
  | 'examples'
  | 'jarvis-usage'
  | 'implementation'
  | 'interview'
  | 'quiz';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: number;
}

export interface LearningTopic {
  slug: string;
  number: number;
  title: string;
  shortDescription: string;
  estimatedMinutes: number;
  prerequisites: string[];
  planned: boolean;
  overview: string;
  keyPoints: string[];
  flow: { label: string; description: string }[];
  realWorldExample: string;
  jarvisUsage: string;
  practicalImplementation: string;
  interviewQuestions: string[];
  quiz: QuizQuestion[];
  playground?: { label: string; href: string; description: string };
}

export interface TopicProgress {
  status: LearningStatus;
  completedTabs: LessonTab[];
  quizScore?: number;
  lastOpenedAt: string;
}

export interface LearningProgressState {
  currentTopic?: string;
  lastTopic?: string;
  topics: Record<string, TopicProgress>;
  developerUnlock: boolean;
}
