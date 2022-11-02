module.exports = (db, session) => ({
    create: ({ collection, data }) => {
        if (typeof data !== 'object') {
            throw new Error(
                'The data must either be an object or an array of objects!'
            )
        }
        const cursor = db.collection(collection)
        if (Array.isArray(data)) {
            return cursor.insertMany(data, { session })
        } else {
            return cursor.insertOne(data, { session })
        }
    },
    read: ({ collection, find, project, sort, limit, skip, aggregate }) => {
        if (typeof aggregate !== 'undefined') {
            if (!Array.isArray(aggregate)) {
                throw new Error(
                    'Your aggregation pipeline must be an array of pipeline stages!'
                )
            }
            const cursor = db.collection(collection).aggregate(aggregate, { session })
            return cursor.toArray()
        } else {
            if (typeof find !== 'object') {
                throw new Error(
                    'Find is required for read operations!'
                )
            }
            let cursor = db.collection(collection).find(find, { session })
            if (sort) cursor = cursor.sort(sort)
            if (project) cursor = cursor.project(project)
            if (skip) cursor = cursor.skip(skip)
            if (limit) cursor = cursor.limit(limit)
            return cursor.toArray()
        }
    },
    update: async ({ collection, find, map }) => {
        if (typeof find !== 'object') {
            throw new Error('Find is required during update operations!')
        }
        if (typeof map !== 'function') {
            throw new Error('Provide a map function to transform the data!')
        }
        const cursor = db.collection(collection).find(find, { session })
        const array = await cursor.toArray()
        const mapped = array.map(map)
        await db
            .collection(collection)
            .deleteMany(find, { session })
        return db
            .collection(collection)
            .insertMany(mapped, { session })
    },
    delete: ({ collection, find }) => {
        if (typeof find !== 'object') {
            throw new Error('Find is required during delete operations!')
        }
        return db
            .collection(collection)
            .deleteMany(find, { session })
    },
    db,
    session
})
