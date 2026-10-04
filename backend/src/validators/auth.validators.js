import { z } from "zod";

const applicantTypeEnum = z.enum(["IAB_MEMBER", "STUDENT"]);

// A short list of passwords that are common/guessable enough to defeat
// length-only requirements (e.g. "test123456" — 10 chars, passes a bare
// min-length check, trivially guessable). Not exhaustive — this is a
// backstop against the most obvious weak choices, on top of the
// complexity rules below, not a substitute for them.
const COMMON_WEAK_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "passw0rd",
  "p@ssw0rd", "1234567890", "123456789", "12345678901", "qwerty123",
  "qwertyuiop", "letmein123", "welcome123", "admin12345", "admin123456",
  "test123456", "testtest12", "changeme123", "iloveyou123", "abc123456",
  "football123", "monkey12345", "superman123", "trustno1234",
]);

export const strongPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(200)
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.")
  .refine((pw) => !/(.)\1{3,}/.test(pw), {
    message: "Password cannot repeat the same character 4 or more times in a row.",
  })
  .refine((pw) => !COMMON_WEAK_PASSWORDS.has(pw.toLowerCase()), {
    message: "This password is too common. Please choose a stronger password.",
  });

// Letters (any language) plus spaces, apostrophes, hyphens, and periods —
// rejects HTML/script-like input (e.g. `<img src=x onerror=...>`) at the
// validation layer, on top of React's output escaping which already
// prevents it from ever executing.
const nameSchema = z
  .string()
  .trim()
  .min(2)
  .max(200)
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u, "Name contains invalid characters.");

// Bangladesh mobile numbers only: 11-digit local (01XXXXXXXXX) or with
// the +880/880 country code, operator prefix 013-019. Tolerates spaces/
// hyphens/parens as typed, strips them before matching.
export const BANGLADESH_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;
function isValidBangladeshPhone(value) {
  return BANGLADESH_PHONE_REGEX.test(value.replace(/[\s\-()]/g, ""));
}
export const bangladeshPhoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((val) => val === "" || isValidBangladeshPhone(val), {
    message: "Please provide a valid Bangladesh phone number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).",
  });

export const registerSchema = z
  .object({
    fullName: nameSchema,
    email: z.string().trim().toLowerCase().email().max(320),
    password: strongPasswordSchema,
    phone: bangladeshPhoneSchema.optional(),
    organization: z.string().trim().max(200).optional(),
    designation: z.string().trim().max(150).optional(),
    applicantType: applicantTypeEnum,
    iabMembershipNumber: z.string().trim().max(50).optional(),
    universityName: z.string().trim().max(200).optional(),
    universityEmail: z.string().trim().toLowerCase().email().max(320).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.applicantType === "IAB_MEMBER" && !data.iabMembershipNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["iabMembershipNumber"],
        message: "IAB membership number is required for IAB members.",
      });
    }
    if (data.applicantType === "STUDENT") {
      if (!data.universityName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["universityName"],
          message: "University name is required for students.",
        });
      }
      if (!data.universityEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["universityEmail"],
          message: "University email is required for students.",
        });
      }
    }
  });

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  })
  .strict();
