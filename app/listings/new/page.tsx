"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewListingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/listings");
  }, [router]);
  return null;
}
