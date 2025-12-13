import { MongoClient } from "mongodb";
import { env } from "@/config/env";

if (!env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const uri = env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export default clientPromise;
