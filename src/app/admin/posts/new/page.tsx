import PostEditor from "../PostEditor";

export const metadata = { title: "New Post" };

export default function NewPostPage() {
  return <PostEditor isNew />;
}
