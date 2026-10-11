# Final receiving fixes and type delta

Bbe01427 (including c4b9ee5) was merged after the full compiled acceptance. Its added unknown-raw-metadata regression passed in the combined suite:287 passed/3 skipped.

Fresh non-incremental compiler diagnosis located the extra server error in Google Civic's voter-info Election mapping after C3 added poll metadata. Commits14a29b2 and54e7e5d now set all three unknown provenance fields to null in both Civic election mappings. Final client/global0 and whole-project963 restore the previous integrated full-project count. These explicit unknown values do not claim poll hours or sources.

Integration54e7e5d has been pushed for final GitHub CI. Prior heads dd0e4cb and14a29b2 passed all three CI jobs including the mandatory compiled poll-hours/FEC/nominee/user/listing/timezone checks. Full-project963 remains a production release blocker. Both Civic commits were sent to Fabel for PR5 inclusion; timezone fixture a10cf36 was sent to Sol. Shared application remains held.
