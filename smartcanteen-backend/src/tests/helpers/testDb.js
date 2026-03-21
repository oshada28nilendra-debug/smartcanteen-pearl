const mongoose = require('mongoose');

const connect = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/smartcanteen_test',
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
};

module.exports = { connect, clearCollections, disconnect };