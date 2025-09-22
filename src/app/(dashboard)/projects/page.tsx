"use client";
import ProjectsPage from "@/components/pages/projects/ProjectsPage";
import { Suspense } from "react";

export default function Projects() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectsPage />
    </Suspense>
  );
}
