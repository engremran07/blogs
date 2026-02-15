import PageEditor from "../../PageEditor";
export const metadata = { title: "Edit Page" };
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageEditor pageId={id} isNew={false} />;
}
