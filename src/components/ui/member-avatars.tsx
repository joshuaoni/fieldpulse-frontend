"use client";

import { useState } from "react";
import { config } from "@/lib/config";

export interface AvatarUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
}

export function avatarSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  return `${config.erpBaseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

const initialsOf = (user: AvatarUser) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

export function MemberAvatars({
  users,
  className = "size-7",
}: {
  users: AvatarUser[];
  className?: string;
}) {
  if (!users.length) return null;

  return (
    <span className="flex shrink-0 -space-x-2">
      {users.map((user) => (
        <Avatar key={user.id} user={user} className={className} />
      ))}
    </span>
  );
}

export function Avatar({ user, className = "size-7" }: { user: AvatarUser; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : avatarSrc(user.profileImageUrl);

  return (
    <span
      title={`${user.firstName} ${user.lastName}`.trim()}
      className={`flex items-center justify-center overflow-hidden rounded-full bg-sunken text-[10px] font-medium text-muted ring-2 ring-surface ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        initialsOf(user)
      )}
    </span>
  );
}
