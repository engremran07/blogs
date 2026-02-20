import PostEditor from "../../_ui/PostEditor";

export const metadata = { title: "Edit Post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostEditor postId={id} isNew={false} />;
}
