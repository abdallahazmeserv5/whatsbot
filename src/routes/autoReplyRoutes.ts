import { Router } from 'express'
import type { AutoReplyService } from '../services/AutoReplyService'

export function createAutoReplyRoutes(autoReplyService: AutoReplyService) {
  const router = Router()

  // Get current auto-reply configuration
  router.get('/', async (req, res) => {
    try {
      const config = await autoReplyService.getConfig()
      res.json(config)
    } catch (error: any) {
      console.error('Error getting auto-reply config:', error)
      res.status(500).json({ error: error.message })
    }
  })

  // Update auto-reply configuration
  router.post('/', async (req, res) => {
    try {
      console.log('📝 Auto-reply POST request received:', req.body)
      const { isActive, senderNumber, messageContent } = req.body

      if (isActive && (!senderNumber || !messageContent)) {
        console.log('⚠️ Validation failed: missing required fields')
        return res.status(400).json({
          error: 'senderNumber and messageContent are required when active',
        })
      }

      console.log('🔄 Updating auto-reply config...')
      const config = await autoReplyService.updateConfig({
        isActive,
        senderNumber,
        messageContent,
      })

      console.log('✅ Auto-reply config updated successfully:', config)
      res.json(config)
    } catch (error: any) {
      console.error('❌ Error updating auto-reply config:')
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('Full error:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  })

  return router
}
