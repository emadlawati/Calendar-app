import { redirect } from "next/navigation";

/** Memories and Highlights are one feed now — "Our Story". */
export default function MemoriesRedirect() {
  redirect("/story");
}
