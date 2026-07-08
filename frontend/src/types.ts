export type TrialStatus = "active" | "closed";

export type EnrollmentStatus = "Submitted" | "Approved" | "Rejected";

export type WalletState = {
  connected: boolean;
  publicKey: string;
  balance: string;
};

export type TrialFormState = {
  trialId: string;
  title: string;
  targetEnrollments: string;
};

export type EnrollmentFormState = {
  trialId: string;
  enrollmentId: string;
  patientCode: string;
};

export type ReviewFormState = {
  enrollmentId: string;
  action: "approve" | "reject";
};

export type ContractArg =
  | {
      type: "address";
      value: string;
    }
  | {
      type: "u32";
      value: number;
    }
  | {
      type: "string";
      value: string;
    }
  | {
      type: "bytes32";
      value: string;
    };

export type ContractIntent = {
  label: string;
  method: string;
  args: ContractArg[];
  preview: string;
};

export type ContractResult = {
  mode: "dry-run" | "submitted";
  message: string;
  transactionHash?: string;
};