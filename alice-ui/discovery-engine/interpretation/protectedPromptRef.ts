export type ProtectedPromptVisibility =
  | "reference_only"
  | "module_private_reference"
  | "policy_private_reference";

export type ProtectedPromptRef = {
  id: string;
  moduleId: string;
  purpose: string;
  version: string;
  visibility: ProtectedPromptVisibility;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type ProtectedPromptRefInput = Omit<ProtectedPromptRef, "visibility"> & {
  visibility?: ProtectedPromptVisibility;
};

export function createProtectedPromptRef(
  input: ProtectedPromptRefInput
): ProtectedPromptRef {
  return {
    ...input,
    visibility: input.visibility ?? "reference_only",
  };
}
