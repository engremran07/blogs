import { AdContainer } from "@/features/ads/ui/AdContainer";
import ContactForm from "./ContactForm";

export const metadata = { title: "Contact Us", description: "Get in touch with us" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Contact Us</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Have a question, suggestion, or want to collaborate? We&apos;d love to hear from you.
        </p>
      </div>

      <ContactForm />

      {/* In-Content Ad */}
      <div className="mt-12">
        <AdContainer position="IN_CONTENT" pageType="contact" />
      </div>
    </div>
  );
}
