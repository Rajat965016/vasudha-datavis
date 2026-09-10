import mongoose from 'mongoose';

/**
 * Atomic named counters. Used to allocate the `publishSequence` that fixes the
 * order approved datasets appear in on the public landing page.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { versionKey: false },
);

counterSchema.statics.next = async function next(name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return doc.value;
};

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
