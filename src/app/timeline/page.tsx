import { redirect } from "next/navigation";

/** The timeline is now a tab of "Our Story". */
export default function TimelineRedirect() {
  redirect("/story");
}
