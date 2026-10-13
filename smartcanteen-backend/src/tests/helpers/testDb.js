const mongoose = require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
let repl;

const connect = async () => {
  if (mongoose.connection.readyState === 1) return;
  repl=await MongoMemoryReplSet.create({replSet:{count:1}});
  await mongoose.connect(
    repl.getUri(),
    { serverSelectionTimeoutMS: 5000 }
  );
};

const clearCollections = async () => {
  if (mongoose.connection.readyState !== 1) return;
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({});
  }
};

const disconnect = async () => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  await repl?.stop();
};

module.exports = { connect, clearCollections, disconnect };