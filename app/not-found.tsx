import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <div className="rounded-lg bg-card p-6 shadow-lg max-w-md w-full text-center">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Page Not Found
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-sm rounded-md"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
} 