export function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isEgyptianMobile(value: string) {
  return /^01\d{9}$/.test(value);
}

export function isSex(value: string) {
  return value === "" || value === "female" || value === "male";
}
