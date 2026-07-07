export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getGuideTemplate } from "@/app/actions/recruitment";
import { PageHeader } from "@/components/ui";
import { GuideTemplateEditor } from "./guide-template-editor";

// Company standard interview guide — every NEW requisition inherits these
// sections as its interview criteria; existing requisitions can pull the
// latest version from their own criteria editor.
export default async function InterviewGuidePage() {
  const sections = await getGuideTemplate();

  return (
    <div>
      <Link
        href="/admin/recruitment"
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Requisitions
      </Link>
      <PageHeader
        title="Standard Interview Guide"
        subtitle="The company-wide template every new requisition starts from — tailor sections, guiding questions and weights, or import an existing interview document."
      />
      <GuideTemplateEditor initial={sections} />
    </div>
  );
}
