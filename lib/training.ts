// Frontend training types (company catalog + assignments).
export type { TrainingCourse } from "@/lib/data";

export type TrainingStatus = "Assigned" | "In-Progress" | "Completed";

export interface TrainingAssignment {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCategory: string;
  contentUrl?: string;
  employeeId: string;
  employeeName: string;
  status: TrainingStatus;
  progress: number;
  assignedAt: string;
  dueDate?: string;
  completedAt?: string;
}

export interface CreateCourseInput {
  title: string;
  category: string;
  description?: string;
  contentUrl?: string;
  durationMins?: number;
  passMark?: number;
  // Optional uploaded material (PDF/slides): base64 payload + its MIME type and
  // original file name (all three together, or none).
  materialFileName?: string;
  materialMimeType?: string;
  materialDataBase64?: string;
  // Optional cover image (PNG/JPEG/WebP) for the catalog card: base64 + MIME.
  coverImageMimeType?: string;
  coverImageDataBase64?: string;
}

export const TRAINING_CATEGORIES = [
  "Health & Safety",
  "Culture",
  "Security",
  "Compliance",
  "Professional Development",
  "Product",
];
