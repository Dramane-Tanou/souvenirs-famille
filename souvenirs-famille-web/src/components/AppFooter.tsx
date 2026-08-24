import Link from "next/link";

export function AppFooter() {
  return (
    <div className="text-center mt-6 space-y-1.5">
      <p className="text-xs text-gray-400">
        <Link href="/terms" className="hover:underline">
          Conditions d&apos;utilisation
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:underline">
          Confidentialité
        </Link>
      </p>
      <p className="text-xs text-gray-400">Créé par Dramane Tanou</p>
    </div>
  );
}
