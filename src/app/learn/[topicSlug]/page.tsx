import { TopicLesson } from '@/components/learn/topic-lesson';

export default async function TopicPage({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  return <TopicLesson slug={topicSlug} />;
}
