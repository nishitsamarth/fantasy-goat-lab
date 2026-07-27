import type { Metadata } from "next";
import FantasyLab from "./ui/FantasyLab";

export const metadata: Metadata = {
  title: "Fantasy GOAT Lab — Build the greatest fantasy lineup ever",
  description:
    "Compare legendary NFL fantasy seasons and build an all-time lineup from real weekly results.",
  openGraph: {
    title: "Fantasy GOAT Lab",
    description: "Build the greatest fantasy football lineup ever.",
    images: ["/og.png"],
  },
};

export default function Home() {
  return <FantasyLab />;
}
