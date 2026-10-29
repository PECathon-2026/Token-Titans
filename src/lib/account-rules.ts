import { z } from "zod";

export const profileName = z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer.");
export const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});
export const READER_PATH = "/timeline" as const;