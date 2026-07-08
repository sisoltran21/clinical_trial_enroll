import { describe, expect, it } from "vitest";
import {
  createClinicalTrialIntent,
  createEnrollmentIntent,
  createReviewIntent,
  invokeContractIntent,
  makePatientHash,
  parsePositiveInteger
} from "./contractService";

const wallet = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("contract service", () => {
  it("validates positive whole numbers", () => {
    expect(parsePositiveInteger("7", "Trial ID")).toBe(7);
    expect(() => parsePositiveInteger("0", "Trial ID")).toThrow("Trial ID");
    expect(() => parsePositiveInteger("abc", "Trial ID")).toThrow("Trial ID");
  });

  it("creates a clinical trial contract intent", () => {
    const intent = createClinicalTrialIntent(wallet, {
      trialId: "12",
      title: "Cardiology Trial",
      targetEnrollments: "30"
    });

    expect(intent.method).toBe("create_trial");
    expect(intent.args).toHaveLength(4);
    expect(intent.preview).toContain("Cardiology Trial");
  });

  it("hashes a patient code into a 32-byte hex string", async () => {
    const hash = await makePatientHash("patient-local-code-01");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("creates an enrollment intent with a patient hash", async () => {
    const intent = await createEnrollmentIntent(wallet, {
      trialId: "5",
      enrollmentId: "88",
      patientCode: "demo-patient"
    });

    expect(intent.method).toBe("submit_enrollment");
    expect(intent.args[3].type).toBe("bytes32");
  });

  it("creates approve and reject review intents", () => {
    const approve = createReviewIntent(wallet, {
      enrollmentId: "9",
      action: "approve"
    });

    const reject = createReviewIntent(wallet, {
      enrollmentId: "10",
      action: "reject"
    });

    expect(approve.method).toBe("approve_enrollment");
    expect(reject.method).toBe("reject_enrollment");
  });

  it("returns dry-run mode when contract id is not configured", async () => {
    const intent = createReviewIntent(wallet, {
      enrollmentId: "9",
      action: "approve"
    });

    const result = await invokeContractIntent(intent, wallet);

    expect(result.mode).toBe("dry-run");
  });
});