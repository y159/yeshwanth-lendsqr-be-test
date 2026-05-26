import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("transactions", (table) => {
    table.uuid("id").primary();

    table.uuid("wallet_id").notNullable();

    table
      .enum("type", ["FUND", "TRANSFER", "WITHDRAW"])
      .notNullable();

    table.decimal("amount", 15, 2).notNullable();

    table
      .enum("status", ["SUCCESS", "FAILED", "PENDING"])
      .notNullable()
      .defaultTo("SUCCESS");

    table.string("reference").notNullable().unique();

    table.uuid("sender_wallet_id").nullable();

    table.uuid("receiver_wallet_id").nullable();

    table.timestamps(true, true);

    table
      .foreign("wallet_id")
      .references("id")
      .inTable("wallets")
      .onDelete("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("transactions");
}