import { z } from "zod";
import { isValidApplicationIdFormat } from "../utils/applicationId.js";
import { isValidGoogleDriveFolderUrl } from "../utils/googleDrive.js";
import { bangladeshPhoneSchema } from "./auth.validators.js";

export const applicationIdParamSchema = z
  .object({
    applicationId: z
      .string()
      .refine(isValidApplicationIdFormat, "Invalid Application ID format."),
  })
  .strict();

const applicantTypeEnum = z.enum(["IAB_MEMBER", "STUDENT"]);

// Same rationale as auth.validators.js's nameSchema — rejects HTML/script-
// like input in name fields at the validation layer.
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u;

/**
 * Fields a client may set when starting or updating a draft submission.
 * Deliberately excludes: id, application_id, user_id, status, created_at,
 * submitted_at, iab_verification_status, university_verification_status —
 * those are backend-controlled per the spec and are stripped by `.strict()`
 * rejecting any unknown key.
 */
export const submissionDraftSchema = z
  .object({
    applicantType: applicantTypeEnum.optional(),

    fullName: z
      .string()
      .trim()
      .max(200)
      .refine((val) => val === "" || namePattern.test(val), {
        message: "Name contains invalid characters.",
      })
      .optional(),
    email: z.string().trim().toLowerCase().email().max(320).optional(),
    phone: bangladeshPhoneSchema.optional(),
    organization: z.string().trim().max(200).optional(),
    designation: z.string().trim().max(150).optional(),
    applicantIsTeamLeader: z.boolean().optional(),
    iabMembershipNumber: z.string().trim().max(50).optional(),
    universityName: z.string().trim().max(200).optional(),
    universityEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(320)
      .optional(),

    projectName: z.string().trim().max(250).optional(),
    projectCategory: z.string().trim().max(100).optional(),
    projectLocation: z.string().trim().max(250).optional(),
    projectStatus: z.string().trim().max(50).optional(),
    clientOwner: z.string().trim().max(250).optional(),
    clientName: z.string().trim().max(200).optional(),
    clientAddress: z.string().trim().max(400).optional(),
    clientContactNumber: z.string().trim().max(30).optional(),
    clientEmail: z.string().trim().toLowerCase().email().max(320).optional(),
    leadEngineer: z.string().trim().max(200).optional(),
    completionYear: z.number().int().min(1900).max(2100).nullable().optional(),

    executiveSummary: z.string().max(20000).optional(),
    projectDescription: z.string().max(20000).optional(),
    designDemonstration: z.string().max(20000).optional(),
    materialSpecifications: z.string().max(20000).optional(),
    constructionTechnology: z.string().max(20000).optional(),
    costing: z.string().max(20000).optional(),
    // NEW — Covering Letter text option (paired with the COVERING_LETTER
    // upload slot in config/documentTypes.js via orTextField).
    coveringLetter: z.string().max(20000).optional(),

    googleDriveUrl: z
      .string()
      .max(2048)
      .refine(isValidGoogleDriveFolderUrl, {
        message:
          "Google Drive URL must look like https://drive.google.com/drive/folders/...",
      })
      .optional(),

    informationConfirmed: z.boolean().optional(),
    filesUploadedConfirmed: z.boolean().optional(),
    namingConventionConfirmed: z.boolean().optional(),
    authenticityConfirmed: z.boolean().optional(),
    termsAccepted: z.boolean().optional(),
  })
  .strict();

// Every field is required for a team member; the type-specific details
// (IEB number, or university name + email) depend on applicantType.
export const memberSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(namePattern, "Name contains invalid characters."),
    position: z.enum(["1", "2", "3", "4", "5"], {
      message: "Select the team member's position (1–5).",
    }),
    phone: z
      .string({ required_error: "Team member's phone number is required." })
      .pipe(bangladeshPhoneSchema)
      .refine((val) => val !== "", {
        message: "Team member's phone number is required.",
      }),
    email: z
      .string({ required_error: "Team member's email is required." })
      .trim()
      .toLowerCase()
      .email("Enter a valid email for the team member.")
      .max(320),
    applicantType: z.enum(["IAB_MEMBER", "STUDENT"], {
      message: "Choose whether the team member is an IEB Member or a Student.",
    }),
    iabMembershipNumber: z.string().trim().max(50).optional(),
    universityName: z.string().trim().max(200).optional(),
    universityEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(320)
      .optional(),
    isTeamLeader: z.boolean().optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.applicantType === "IAB_MEMBER" && !m.iabMembershipNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["iabMembershipNumber"],
        message: "Team member's IEB membership number is required.",
      });
    }
    if (m.applicantType === "STUDENT") {
      if (!m.universityName) {
        ctx.addIssue({
          code: "custom",
          path: ["universityName"],
          message: "Team member's university name is required.",
        });
      }
      if (!m.universityEmail) {
        ctx.addIssue({
          code: "custom",
          path: ["universityEmail"],
          message: "Team member's university email is required.",
        });
      }
    }
  });

export const memberIdParamSchema = z
  .object({
    applicationId: z
      .string()
      .refine(isValidApplicationIdFormat, "Invalid Application ID format."),
    memberId: z.string().uuid("Invalid member ID."),
  })
  .strict();

export const guestStartSubmissionSchema = z
  .object({
    guestEmail: z.string().trim().toLowerCase().email().optional(),
  })
  .strict()
  .optional();
