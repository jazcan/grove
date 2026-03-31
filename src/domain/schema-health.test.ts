import { describe, expect, it } from "vitest";
import {
  evaluateSchemaAgainstRequirements,
  formatSchemaHealthSummary,
  getRequiredSchema,
  type SchemaHealthResult,
} from "@/domain/schema-health";

describe("evaluateSchemaAgainstRequirements", () => {
  it("reports nothing when all tables and columns exist", () => {
    const required = getRequiredSchema();
    const existingTables = new Set(required.tables.map((t) => t.table));
    const columnsByTable = new Map<string, Set<string>>();
    for (const spec of required.tables) {
      columnsByTable.set(spec.table, new Set(spec.requiredColumns));
    }
    const { missingTables, missingColumns } = evaluateSchemaAgainstRequirements(
      required,
      existingTables,
      columnsByTable
    );
    expect(missingTables).toEqual([]);
    expect(missingColumns).toEqual([]);
  });

  it("reports missing table", () => {
    const required = {
      tables: [{ feature: "test", table: "ghost_table", requiredColumns: ["id"] }],
    };
    const { missingTables, missingColumns } = evaluateSchemaAgainstRequirements(
      required,
      new Set(),
      new Map()
    );
    expect(missingTables).toEqual([{ table: "ghost_table" }]);
    expect(missingColumns).toEqual([]);
  });

  it("reports missing column when table exists", () => {
    const required = {
      tables: [{ feature: "test", table: "t1", requiredColumns: ["id", "name"] }],
    };
    const { missingTables, missingColumns } = evaluateSchemaAgainstRequirements(
      required,
      new Set(["t1"]),
      new Map([["t1", new Set(["id"])]])
    );
    expect(missingTables).toEqual([]);
    expect(missingColumns).toEqual([{ table: "t1", column: "name" }]);
  });
});

describe("formatSchemaHealthSummary", () => {
  it("includes error when check failed", () => {
    const r: SchemaHealthResult = {
      ok: false,
      checkedAt: "2026-01-01T00:00:00.000Z",
      missingTables: [],
      missingColumns: [],
      checkedTables: 1,
      checkedColumns: 2,
      error: "DATABASE_URL is not set",
    };
    expect(formatSchemaHealthSummary(r)).toContain("FAILED TO RUN");
    expect(formatSchemaHealthSummary(r)).toContain("DATABASE_URL");
  });

  it("shows OK when healthy", () => {
    const r: SchemaHealthResult = {
      ok: true,
      checkedAt: "2026-01-01T00:00:00.000Z",
      missingTables: [],
      missingColumns: [],
      checkedTables: 3,
      checkedColumns: 10,
    };
    expect(formatSchemaHealthSummary(r)).toContain("OK");
    expect(formatSchemaHealthSummary(r)).toContain("none");
  });
});
