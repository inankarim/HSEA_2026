import { z } from "zod";

const applicantTypeEnum = z.enum(["IAB_MEMBER", "STUDENT"]);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200),
    email: z.string().trim().toLowerCase().email().max(320),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .max(200),
    phone: z.string().trim().max(30).optional(),
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
