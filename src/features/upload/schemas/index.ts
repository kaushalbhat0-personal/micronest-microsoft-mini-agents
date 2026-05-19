import { z } from "zod";
import { FILE } from "@/shared/utils/constants";

export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => FILE.ACCEPTED_TYPES.includes(f.type as (typeof FILE.ACCEPTED_TYPES)[number]), {
      message: "File must be CSV or Excel (.xlsx, .xls)",
    })
    .refine((f) => f.size <= FILE.MAX_SIZE_BYTES, {
      message: `File must be less than ${FILE.MAX_SIZE_MB}MB`,
    }),
});

export const columnMappingSchema = z.record(
  z.string(),
  z.enum(["name", "phone", "email", "amount", "date", "status", "notes", "ignore"])
);

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type ColumnMapping = z.infer<typeof columnMappingSchema>;
