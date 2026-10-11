import { describe, it, expect } from "vitest";

// Strict tranche 2: the runbook service used to simulate steps (setTimeout), report every
// validation as passed and every notification as sent, and write field names the tables do
// not have. These tests drive the real service over the real in-memory storage with a
// recording notification queue and a recording scheduler: nothing is mocked away, and every
// outcome lands on the execution row in the columns that exist.
process.env.JWT_SECRET ??= "test-only-secret-for-import";
process.env.SESSION_SECRET ??= "test-only-secret-for-import";

const { MemStorage } = await import("../../server/mem-storage");
const { IncidentRunbookService } = await import("../../server/services/incident-runbook-service");

type Queued = { type: string; recipient: string; content: { subject?: string; message: string }; priority: string };

async function fixture() {
  const storage = new MemStorage();
  const queued: Queued[] = [];
  const scheduled: number[] = [];
  const service = new IncidentRunbookService(storage, {
    queue: async (d) => { queued.push(d); return `delivery-${queued.length}`; },
    schedule: (_fn, ms) => { scheduled.push(ms); return setTimeout(() => undefined, 0); },
  });
  await service.createRunbook({
    runbookId: "RB-DB-OUTAGE", title: "Database outage", incidentType: "database_outage", severity: "high",
    category: "infrastructure", version: "1.0", status: "active", automationLevel: "manual", accessLevel: "internal",
  } as any);
  await storage.createRunbookStep({ runbookId: "RB-DB-OUTAGE", stepOrder: 1, stepId: "S1", title: "Page on-call", stepType: "notification" } as any);
  await storage.createRunbookStep({ runbookId: "RB-DB-OUTAGE", stepOrder: 2, stepId: "S2", title: "Fail over to replica", stepType: "manual", instructions: "Run the failover runbook", isCritical: true } as any);
  await storage.createRunbookStep({ runbookId: "RB-DB-OUTAGE", stepOrder: 3, stepId: "S3", title: "Escalate to lead", stepType: "escalation" } as any);
  await service.createContact({ contactId: "C-ONCALL", name: "On-call DBA", escalationLevel: 1, isActive: true, primaryEmail: "oncall@example.test" } as any);
  await service.createContact({ contactId: "C-LEAD", name: "Platform lead", escalationLevel: 2, isActive: true, smsNumber: "+15555550100", preferredContactMethod: "sms" } as any);
  // a pre-existing phone-only row (the service refuses to create new unreachable contacts)
  await storage.createRunbookContact({ contactId: "C-NOCHANNEL", name: "Phone-only exec", escalationLevel: 2, isActive: true, primaryPhone: "+15555550199" } as any);
  await service.createEscalationTree({
    treeId: "T-DB", name: "Database escalation", incidentTypes: ["database_outage"], severityLevels: ["high", "critical"],
    isActive: true, autoEscalationEnabled: true, escalationIntervalMinutes: 5, maxEscalationLevel: 3,
  } as any);
  const incident = {
    incidentId: "INC-1", incidentType: "database_outage", severity: "high" as const, description: "Primary database unreachable",
    affectedSystems: ["postgres"], detectedAt: new Date(), reportedBy: "monitor", environment: "production",
  };
  return { storage, service, queued, scheduled, incident };
}

async function until(cond: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error("condition not met in time");
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe("IncidentRunbookService (real storage, recording queue)", () => {
  it("runs notification steps for real, stops at the manual step, and records it all on the execution row", async () => {
    const { storage, service, queued, incident } = await fixture();
    const ctx = await service.executeRunbookForIncident(incident, "ops@example.test");
    await until(() => ctx.status === "paused");

    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ type: "email", recipient: "oncall@example.test", priority: "high" });
    expect(queued[0].content.message).toContain("INC-1");

    const row = await storage.getRunbookExecution(ctx.executionId);
    expect(row.status).toBe("paused");
    expect(row.currentStep).toBe("S2");
    expect(row.runbookId).toBe(ctx.runbookId);
    expect(row.executionType).toBe("emergency");
    expect(row.contactsNotified).toEqual(["C-ONCALL"]);
    expect(row.completedSteps).toEqual(["S1"]);
    expect(row.stepResults.map((r: any) => [r.stepKey, r.status])).toEqual([["S1", "completed"], ["S2", "awaiting_operator"]]);
    expect(row.stepResults[1].detail.instructions).toBe("Run the failover runbook");
    expect(row.metadata.pauseReason).toMatch(/requires an operator/);
    expect(row.metadata.runbookTitle).toBe("Database outage");
    const oncall = (await storage.getContactsByEscalationLevel(1))[0];
    expect(oncall.lastContactedAt).toBeInstanceOf(Date);
  });

  it("resume records the operator's confirmation, escalates through the tree, and completes honestly", async () => {
    const { storage, service, queued, scheduled, incident } = await fixture();
    const ctx = await service.executeRunbookForIncident(incident, "ops@example.test");
    await until(() => ctx.status === "paused");

    await expect(service.resumeExecution("nope")).rejects.toMatchObject({ status: 404, publicCode: "execution_not_active" });
    await service.resumeExecution(ctx.executionId, "dba@example.test");
    await until(() => ctx.status === "completed");

    const row = await storage.getRunbookExecution(ctx.executionId);
    expect(row.status).toBe("completed");
    expect(row.isSuccessful).toBe(true);
    expect(row.successRate).toBe("100.00");
    expect(row.completedSteps).toEqual(["S1", "S2", "S3"]);
    expect(row.failedSteps).toEqual([]);
    expect(row.stepResults[1]).toMatchObject({ stepKey: "S2", status: "completed", detail: { confirmedBy: "dba@example.test" } });
    expect(row.metadata.resumedBy).toBe("dba@example.test");

    // escalation step: level 2 contacts — SMS to the lead, phone-only exec recorded as unreachable
    expect(row.escalationTreeUsed).toBe("T-DB");
    expect(row.metadata.escalationLevel).toBe(2);
    expect(row.metadata.escalations).toHaveLength(1);
    const notified = row.metadata.escalations[0].contacts;
    expect(notified.map((n: any) => [n.contactId, n.channel, n.status]).sort()).toEqual([
      ["C-LEAD", "sms", "queued"],
      ["C-NOCHANNEL", "none", "no_channel"],
    ]);
    expect(row.contactsNotified).toEqual(["C-ONCALL", "C-LEAD"]);
    expect(queued.map((q) => q.type)).toEqual(["email", "sms"]);
    expect(queued[1].content.subject).toContain("ESCALATION level 2");
    expect(scheduled).toEqual([5 * 60 * 1000]);
    expect(service.getExecutionContext(ctx.executionId)).toBeUndefined();
    service.destroy();
  });

  it("refuses to resume an execution that is not paused and refuses an unknown runbook", async () => {
    const { service, incident } = await fixture();
    await expect(service.executeRunbookForIncident({ ...incident, incidentType: "unknown_kind" }, "ops")).rejects.toMatchObject({ status: 404, publicCode: "runbook_not_found" });
    const ctx = await service.executeRunbookForIncident(incident, "ops");
    await until(() => ctx.status === "paused");
    await service.pauseExecution(ctx.executionId, "holding");
    await service.resumeExecution(ctx.executionId);
    await until(() => ctx.status === "completed");
    await expect(service.resumeExecution(ctx.executionId)).rejects.toMatchObject({ status: 404 });
    service.destroy();
  });

  it("will not create a contact nobody can reach, nor a runbook without a title", async () => {
    const { service } = await fixture();
    await expect(service.createContact({ contactId: "C-X", name: "Nobody", escalationLevel: 1, isActive: true } as any)).rejects.toMatchObject({ status: 400, publicCode: "invalid_contact" });
    await expect(service.createRunbook({ runbookId: "RB-X", title: "  ", incidentType: "x", severity: "low" } as any)).rejects.toMatchObject({ status: 400, publicCode: "invalid_runbook" });
  });

  it("the old simulation is gone from the source", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(__dirname, "..", "..", "server", "services", "incident-runbook-service.ts"), "utf8");
    for (const fake of ["simulateStepExecution", "passed: true", "runbook.runbookTitle", "newRunbook.runbookTitle", ".stepTitle", ".phoneNumber", ".treeName", "escalationReason:"]) {
      expect(src, fake).not.toContain(fake);
    }
  });
});
