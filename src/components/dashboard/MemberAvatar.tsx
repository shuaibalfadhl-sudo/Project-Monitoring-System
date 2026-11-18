"use client";

import { useState } from "react";

export default function MemberAvatar({
  name,
  src,
  className = "",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name || "?").charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className={`rounded-full shrink-0 flex items-center justify-center font-bold ${className}`}>
        {initial}
      </div>
    );
  }

  return (
    <div className={`relative rounded-full overflow-hidden shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}