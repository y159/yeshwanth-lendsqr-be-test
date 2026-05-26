import knex from "knex";
import config from "./knexfile";

const environment = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV || "development";

const database = knex(config[environment]);

export default database;
