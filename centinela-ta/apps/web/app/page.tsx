"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { obtenerUsuario } from "@/lib/api";

export default function Inicio() {
  const router = useRouter();

  useEffect(() => {
    router.replace(obtenerUsuario() ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
