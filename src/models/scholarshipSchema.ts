import { z } from "zod";

export const TargetDemographicsSchema = z.enum(["SC", "ST", "OBC", "General", "Women"]);
export type TargetDemographic = z.infer<typeof TargetDemographicsSchema>;

export const ScholarshipSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  provider: z.string(),
  amount_inr: z.number().optional(),
  target_demographics: z.array(TargetDemographicsSchema),
  financial_criteria: z.object({
    max_family_income_inr: z.number().optional()
  }).optional(),
  academic_criteria: z.object({
    min_cgpa: z.number().optional(),
    eligible_courses: z.array(z.string()).optional()
  }).optional(),
  deadline: z.string().optional(),
  link: z.string().url().optional(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type Scholarship = z.infer<typeof ScholarshipSchema>;

export const AIEvaluationResponseSchema = z.object({
  is_eligible: z.boolean(),
  missing_requirements: z.array(z.string()),
  confidence_score: z.number().min(0).max(100),
});

export type AIEvaluationResponse = z.infer<typeof AIEvaluationResponseSchema>;
