import { redirect } from "next/navigation";

/** Stats and gamification live on "Our Shelf". */
export default function StatsRedirect() {
  redirect("/shelf");
}
