import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  traceId: { type: String, unique: true, index: true },
  requestId: String,
  conversationId: String,
  userQuery: String,
  startedAt: Date,
  completedAt: Date,
  durationMs: Number,
  queryUnderstanding: Schema.Types.Mixed,
  routing: Schema.Types.Mixed,
  entityResolution: Schema.Types.Mixed,
  knowledgeGraph: Schema.Types.Mixed,
  structuredFactQuery: Schema.Types.Mixed,
  retrieval: Schema.Types.Mixed,
  evaluation: Schema.Types.Mixed,
  toolCalling: Schema.Types.Mixed,
  generation: Schema.Types.Mixed,
  shadowModeEnabled: Boolean,
  oldRoutingResult: Schema.Types.Mixed,
  newPlannerResult: Schema.Types.Mixed,
  contextResolution: Schema.Types.Mixed,
  newExecutorResult: Schema.Types.Mixed,
  routingDifferences: Schema.Types.Mixed,
  pipelineComparison: Schema.Types.Mixed,
  pipelineTimeline: [String],
  comparisonStatus: String,
  errors: [String],
}, { timestamps: true });

schema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const existing = mongoose.models.AITrace;
if (existing && !existing.schema.path('structuredFactQuery')) {
  existing.schema.add({ structuredFactQuery: Schema.Types.Mixed });
}

export default existing || mongoose.model('AITrace', schema);
