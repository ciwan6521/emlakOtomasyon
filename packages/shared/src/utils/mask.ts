export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\s+/g, "");
  if (digits.length <= 4) return "•".repeat(digits.length);
  const head = digits.slice(0, Math.min(4, digits.length - 2));
  const tail = digits.slice(-2);
  return `${head}${"•".repeat(Math.max(3, digits.length - 6))}${tail}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "•".repeat(email.length);
  const visible = local.slice(0, 1);
  return `${visible}${"•".repeat(Math.max(2, local.length - 1))}@${domain}`;
}
