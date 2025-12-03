import mongoose from 'mongoose'
import pino from 'pino'

const logger = pino({ name: 'mongodb' })

let isConnected = false

export const connectToDatabase = async (): Promise<void> => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection')
    return
  }

  const uri = process.env.DATABASE_URI
  if (!uri) {
    throw new Error('DATABASE_URI environment variable is not set')
  }

  try {
    await mongoose.connect(uri)
    isConnected = true
    logger.info('✅ MongoDB connected successfully')

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
      isConnected = false
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
      isConnected = true
    })
  } catch (error) {
    logger.error({ error })
    throw error
  }
}

export const disconnectFromDatabase = async (): Promise<void> => {
  if (!isConnected) {
    return
  }

  try {
    await mongoose.disconnect()
    isConnected = false
    logger.info('MongoDB disconnected')
  } catch (error) {
    logger.error({ error })
    throw error
  }
}

export { mongoose }
