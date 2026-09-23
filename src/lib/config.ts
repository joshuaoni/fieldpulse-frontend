function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  apiBaseUrl: required(
    "NEXT_PUBLIC_FIELDPULSE_API_URL",
    process.env.NEXT_PUBLIC_FIELDPULSE_API_URL,
  ).replace(/\/$/, ""),

  erpBaseUrl: required("NEXT_PUBLIC_ERP_API_URL", process.env.NEXT_PUBLIC_ERP_API_URL).replace(
    /\/$/,
    "",
  ),
  chatwootOrigin: process.env.NEXT_PUBLIC_CHATWOOT_ORIGIN ?? "https://app.chatwoot.com",
} as const;
