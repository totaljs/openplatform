var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=\'tbl_user_member\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	// Tables
	db.query(`CREATE TABLE "public"."tbl_user_member" (
		"id" varchar(25) NOT NULL,
		"userid" varchar(25),
		"email" varchar(120),
		"dtcreated" timestamp,
		CONSTRAINT "tbl_user_member_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
		PRIMARY KEY ("id")
	)`);

	// Indexes
	db.query('CREATE INDEX tbl_user_member_idx_user ON tbl_user_member(userid text_ops);');
	db.query('CREATE INDEX tbl_user_idx_member ON tbl_user(email text_ops);');
});

db.callback($.done());