import { z } from 'zod';

const updateNoteSchema = z.object({
  params: z.object({
    noteId: z.string().length(24).optional(), // Optional because POST doesn't have an ID in the URL
  }),
  body: z.object({
    // Allow title to be optional or empty string so backend can handle "Untitled"
    title: z.string().max(100).optional().transform(val => val?.trim() === "" ? "Untitled Note" : val),
    
    // Type is always sent, so it stays required
    type: z.enum(["NOTE", "TODO"]), 
    
    bgColor: z.string().optional(),
    isPinned: z.boolean().default(false),
    content: z.string().optional(),
    items: z.array(
      z.object({
        text: z.string(),
        completed: z.boolean().default(false)
      })
    ).optional(),
    reminderTime: z.string().nullable().optional(),
    reminderRepeat: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
  })
});

export { updateNoteSchema };