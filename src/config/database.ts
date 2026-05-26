import knex from "knex";
import config from "./knexfile";

const environment = "development";

const database = knex(config[environment]);

export default database;