const express = require('express')
const MongoClient = require('mongodb').MongoClient
const { Binary } = require('mongodb')

const cors = require('cors')

const app = express()
const port = 3000

// MongoDB setup
const url = 'mongodb://localhost:27017/'
const dbName = 'audioScriber-db'

async function connectToDb() {
  try {
    const client = await MongoClient.connect(url)
    console.log('Connected to Database')
    const db = client.db(dbName)
    return db
  } catch (error) {
    console.error('Error connecting to the database:', error)
    throw error // Rethrow or handle as needed
  }
}

app.use(cors())

// ----- Routes -----
// Retrieve all audio sessions from the DB
app.get('/sessions', async (req, res) => {
  try {
    const db = await connectToDb()
    const audioSessions = await db.collection('audioSessions').find().toArray()
    console.log('audioSessions:', audioSessions)
    // const audioChunks = await db.collection('audioChunks').find().toArray()
    res.json(audioSessions)
  } catch (error) {
    res.status(500).send(error)
  }
})

// POST route to receive a stream of WAV audio file chunks
app.post(
  '/upload-chunk',
  express.raw({ type: 'audio/wav', limit: '50mb' }),
  async (req, res) => {
    try {
      const audioChunk = {
        sessionId: req?.headers?.sessionid,
        chunkNumber: parseInt(req?.headers?.chunknumber),
        chunkData: req.body,
        timestamp: new Date()
      }

      const db = await connectToDb()
      await db.collection('audioChunks').insertOne(audioChunk)
      res.status(200).send('Chunk uploaded and saved to database')
    } catch (error) {
      console.error('Error inserting audioChunk:', error)
      res.status(500).send(error)
    }
  }
)

// POST route to receive the final audio file aka session
app.post(
  '/upload-session',
  express.raw({ type: 'audio/wav', limit: '50mb' }),
  async (req, res) => {
    try {
      // Ensure req.body is a Buffer
      if (!(req.body instanceof Buffer)) {
        console.log(typeof req.body)
        throw new Error('Request body is not a buffer')
      }
      const audioSession = {
        sessionId: req?.headers?.sessionid,
        audioFile: new Binary(req.body), // Convert the raw buffer to MongoDB's Binary type
        metadata: {
          size: req?.headers?.size,
          format: req?.headers?.format
        },
        timestamp: new Date()
      }

      const db = await connectToDb()
      await db.collection('audioSessions').insertOne(audioSession)
      res.status(200).send('Final audio file uploaded and saved to db')
    } catch (error) {
      console.error('Error inserting audio session:', error)
      res.status(500).send(error)
    }
  }
)

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
