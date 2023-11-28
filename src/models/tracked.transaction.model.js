const mongoose = require('mongoose');

const trackedTransactionSchema = mongoose.Schema(
    {
        wallet: { type: mongoose.SchemaTypes.ObjectId, ref: 'TrackedWallet', required: true, index: true },
        chainId: { type: String, required: true, index: true },
        sqId: { type: String, index: true, required: true },
        tx: {}, 
        block: {},
        logs: [],
        traces: [],
        tmSent: { type: Boolean, default: false }  
    },
    {
        timestamps: true,
    }
);

const TrackedTransaction = mongoose.model('TrackedTransaction', trackedTransactionSchema);

module.exports = { TrackedTransaction, trackedTransactionSchema };
