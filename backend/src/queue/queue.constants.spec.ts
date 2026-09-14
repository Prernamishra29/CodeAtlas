import { describe, expect, it } from "vitest";
import { BACKOFF_MS, JOB_TIMEOUT_MS, MAX_ATTEMPTS, defaultJobOptions, isTerminalAnalysisStatus } from "./queue.constants";

describe("queue policy", () => {
  it("retries with exponential backoff, timeout, and DLQ-friendly failure retention", () => {
    expect(MAX_ATTEMPTS).toBe(3);
    expect(defaultJobOptions.backoff).toEqual({ type: "exponential", delay: BACKOFF_MS });
    expect(defaultJobOptions.timeout).toBe(JOB_TIMEOUT_MS);
    expect(defaultJobOptions.removeOnFail).toBe(false);
  });

  it("treats completed and cancelled analyses as idempotent terminals", () => {
    expect(isTerminalAnalysisStatus("completed")).toBe(true);
    expect(isTerminalAnalysisStatus("cancelled")).toBe(true);
    expect(isTerminalAnalysisStatus("queued")).toBe(false);
  });
});
