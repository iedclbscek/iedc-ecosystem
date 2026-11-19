import { RefreshCw } from "lucide-react";

const Block = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 ${className}`} aria-hidden="true" />
);

export const RouteSkeleton = () => (
  <div className="min-h-screen bg-bg-main pt-28" aria-busy="true" aria-label="Loading page">
    <div className="container mx-auto px-6 space-y-7">
      <Block className="h-4 w-28" />
      <Block className="h-14 max-w-2xl" />
      <Block className="h-5 max-w-xl" />
      <div className="grid gap-6 pt-8 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <Block key={index} className="h-56 w-full" />)}
      </div>
    </div>
  </div>
);

export const EventsSkeleton = () => (
  <div className="min-h-screen bg-bg-main" aria-busy="true" aria-label="Loading events">
    <section className="pt-32 pb-16 bg-white border-b border-gray-200">
      <div className="container mx-auto px-6 space-y-5">
        <Block className="h-4 w-32" />
        <Block className="h-14 max-w-xl" />
        <Block className="h-5 max-w-2xl" />
      </div>
    </section>
    <div className="container mx-auto px-6 py-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="bg-white border border-gray-200 p-5 space-y-4">
          <Block className="h-44 w-full" />
          <Block className="h-4 w-24" />
          <Block className="h-7 w-4/5" />
          <Block className="h-4 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export const EventDetailSkeleton = () => (
  <div className="min-h-screen bg-bg-main pt-28" aria-busy="true" aria-label="Loading event">
    <div className="container mx-auto px-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <Block className="aspect-[4/3] w-full" />
      <div className="space-y-6 py-6">
        <Block className="h-4 w-28" />
        <Block className="h-14 w-full" />
        <Block className="h-5 w-3/4" />
        <Block className="h-5 w-2/3" />
        <Block className="h-28 w-full" />
      </div>
    </div>
  </div>
);

export const TeamSkeleton = () => (
  <div className="grid gap-12" aria-busy="true" aria-label="Loading team roster">
    <div className="grid gap-8 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="flex gap-5 items-center">
          <Block className="h-32 w-28 shrink-0" />
          <div className="flex-1 space-y-3"><Block className="h-7 w-3/4" /><Block className="h-4 w-1/2" /></div>
        </div>
      ))}
    </div>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="space-y-3"><Block className="aspect-square w-full" /><Block className="h-5 w-3/4" /><Block className="h-4 w-1/2" /></div>
      ))}
    </div>
  </div>
);

export const ProfileSkeleton = ({ compact = false }) => (
  <div className={compact ? "bg-white py-6" : "min-h-screen bg-[#F5F5F0] pt-32"} aria-busy="true" aria-label="Loading profile">
    <div className="container mx-auto px-6 max-w-4xl grid gap-10 md:grid-cols-[260px_1fr]">
      <Block className="aspect-square w-full" />
      <div className="space-y-5 py-4"><Block className="h-12 w-4/5" /><Block className="h-5 w-2/5" /><Block className="h-24 w-full" /><Block className="h-10 w-40" /></div>
    </div>
  </div>
);

export const PublicErrorState = ({ title, message, onRetry }) => (
  <div className="min-h-[55vh] flex items-center justify-center px-6" role="alert">
    <div className="max-w-lg border border-red-200 bg-white p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-red-600 mb-3">Connection interrupted</p>
      <h2 className="text-3xl font-black uppercase tracking-tight text-text-dark mb-3">{title}</h2>
      <p className="text-text-light mb-7">{message}</p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 bg-text-dark px-5 py-3 text-white font-mono text-xs font-bold uppercase tracking-widest">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  </div>
);
