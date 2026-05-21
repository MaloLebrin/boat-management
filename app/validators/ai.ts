import vine from '@vinejs/vine'

export const aiChatValidator = vine.compile(
  vine.object({
    messages: vine
      .array(
        vine.object({
          role: vine.enum(['user', 'assistant'] as const),
          content: vine.string().minLength(1).maxLength(4000),
        })
      )
      .minLength(1)
      .maxLength(50),
  })
)
