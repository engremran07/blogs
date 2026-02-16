import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import SearchContent from "./SearchContent";

export const metadata = { title: "Search", description: "Search articles" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <SearchContent />
      </Suspense>

      {/* In-Content Ad */}
      <div className="mt-10">
        <AdContainer position="IN_CONTENT" pageType="search" />
      </div>
    </div>
  );
}
