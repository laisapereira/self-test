import { QuestionRequestCreatePage } from "./_form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  return <QuestionRequestCreatePage classId={classId} />;
}
