import { db } from "./server/db";
import { sql } from "drizzle-orm";

/**
 * Analyze All Database Tables
 * 
 * This script analyzes all tables in the database and provides:
 * - Row counts for each table
 * - Classification of tables (external data vs user-generated)
 * - Completion percentage
 * - Recommendations for missing data
 */

async function analyzeTables() {
  console.log("🔍 ANALYZING DATABASE TABLES\n");
  console.log("=" .repeat(70));

  try {
    // Tables that should have external data
    const externalDataTables = [
      { name: "candidate_profiles", expectedMin: 1 },
      { name: "candidate_positions", expectedMin: 1 },
      { name: "candidate_data_sources", expectedMin: 1 },
      { name: "congress_members", expectedMin: 100 },
      { name: "congress_bills", expectedMin: 10 },
      { name: "congress_committees", expectedMin: 10 },
      { name: "election_cycles", expectedMin: 1 },
      { name: "real_time_polling", expectedMin: 1 },
      { name: "elections", expectedMin: 1 },
      { name: "candidates", expectedMin: 1 }
    ];

    // Tables that are legitimately empty (user/campaign generated)
    const userGeneratedTables = [
      "candidate_qa",
      "candidate_accounts",
      "candidate_subscriptions",
      "campaign_accounts",
      "campaign_content",
      "voter_interactions",
      "users",
      "watchlist",
      "sessions"
    ];

    console.log("\n📊 EXTERNAL DATA TABLES (Should Have Data):\n");
    
    const tableStats = [];
    let totalExpected = 0;
    let totalActual = 0;

    for (const table of externalDataTables) {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(table.name)}`);
      const count = Number(result.rows[0]?.count || 0);
      
      const status = count >= table.expectedMin ? "✅" : "❌";
      const percentage = table.expectedMin > 0 
        ? Math.min(100, Math.round((count / table.expectedMin) * 100))
        : 0;
      
      tableStats.push({
        name: table.name,
        count,
        expected: table.expectedMin,
        status,
        percentage
      });
      
      totalExpected += table.expectedMin;
      totalActual += count;
      
      console.log(`${status} ${table.name.padEnd(30)} ${String(count).padStart(6)} rows (Expected: ${table.expectedMin}+)`);
    }

    console.log("\n" + "-".repeat(70));
    console.log(`   TOTAL EXTERNAL DATA RECORDS: ${totalActual} / ${totalExpected}+ expected`);
    
    const overallCompletion = totalExpected > 0 
      ? Math.min(100, Math.round((totalActual / totalExpected) * 100))
      : 0;
    console.log(`   COMPLETION: ${overallCompletion}%`);

    console.log("\n\n📋 USER-GENERATED TABLES (Empty Until Users/Campaigns Interact):\n");
    
    for (const tableName of userGeneratedTables) {
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
        const count = Number(result.rows[0]?.count || 0);
        console.log(`   ${tableName.padEnd(35)} ${String(count).padStart(6)} rows`);
      } catch (error) {
        console.log(`   ${tableName.padEnd(35)} (table may not exist)`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("\n📈 RECOMMENDATIONS:\n");

    const emptyTables = tableStats.filter(t => t.count === 0);
    if (emptyTables.length > 0) {
      console.log("❌ Empty Tables That Need Data:");
      for (const table of emptyTables) {
        console.log(`   • ${table.name}`);
      }
      console.log("\n   Run these scripts to populate:");
      console.log("   1. npx tsx populate_all_tables.ts");
      console.log("   2. npx tsx populate_congress_and_cycles.ts");
      console.log("   3. npx tsx populate_polling_data.ts\n");
    } else {
      console.log("✅ All external data tables have been populated!");
      console.log("   Your platform is ready to use!\n");
    }

    console.log("=".repeat(70));

    // Return summary for scripting
    return {
      totalTables: externalDataTables.length,
      populatedTables: tableStats.filter(t => t.count > 0).length,
      totalRecords: totalActual,
      completionPercentage: overallCompletion,
      emptyTables: emptyTables.map(t => t.name)
    };

  } catch (error) {
    console.error("❌ Error analyzing tables:", error);
    throw error;
  }
}

// Run the script
analyzeTables()
  .then((summary) => {
    console.log("\n✅ Analysis complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  });
