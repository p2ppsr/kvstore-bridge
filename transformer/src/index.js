exports.transformer = async (req, res) => {
    const { MongoClient } = require('mongodb')
    const state = require('./state')
    const processTransaction = require('./process')

    // Connect to the MongoDB
    const mongoClient = new MongoClient(
        process.env.MONGODB_WRITE_CREDS,
        { useUnifiedTopology: true }
    )
    await mongoClient.connect()
    const db = mongoClient.db(process.env.MONGODB_DATABASE)
    const session = await mongoClient.startSession()
    const stateApi = state(db, session)

    if (req.body.action === 'process') {
        await processTransaction(stateApi, req.body.payload)
    } else if (req.body.action === 'bulkProcess') {
        for (const action of req.body.payload) {
            await processTransaction(stateApi, action)
        }
    }

    res.status(200).json({ status: 'success' })
}
