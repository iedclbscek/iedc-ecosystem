import mongoose from 'mongoose';
import Registration from '../models/Registration.js';
import StaffGuestRegistration from '../models/StaffGuestRegistration.js';
import FirstYear from '../models/FirstYearRepresentativeApplication.js';
import SecondYear from '../models/SecondYearRepresentativeApplication.js';
import ClubMembership from '../models/ClubMembership.js';
import Event from '../models/Event.js';

// Add declared indexes without dropping existing indexes or changing database access rules.
try {
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI for the intended database.');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  for (const model of [Registration, StaffGuestRegistration, FirstYear, SecondYear, ClubMembership, Event]) {
    for (const [keys, options] of model.schema.indexes()) {
      if (!options.unique && Object.keys(keys).length > 1) {
        await model.collection.createIndex(keys, options);
      }
    }
    console.log(JSON.stringify({ database: mongoose.connection.name, collection: model.collection.name, indexes: 'ready' }));
  }
} catch (error) {
  console.error('Could not create indexes:', error.code || error.name);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
