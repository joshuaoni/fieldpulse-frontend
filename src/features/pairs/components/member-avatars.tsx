import { fullName, type PairUser } from "../types";

export function MemberAvatars({ users }: { users: PairUser[] }) {
  if (!users.length) return null;

  return (
    <span className="flex shrink-0 -space-x-2">
      {users.map((user) => (
        <span
          key={user.id}
          title={fullName(user)}
          className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-sunken text-[10px] font-medium text-muted ring-2 ring-surface"
        >
          {user.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImageUrl} alt="" className="size-full object-cover" />
          ) : (
            `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
          )}
        </span>
      ))}
    </span>
  );
}
