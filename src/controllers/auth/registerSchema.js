

import { z} from 'zod';


 const registerSchema = z.object({
  body: z.object({
    name: z.string().min(4),
    email: z.email(),
    password: z.string().min(8),
  })
});


 const loginSchema = z.object({
   body: z.object({
      email: z.email("Invalid email format"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      twoFactorCode: z.string().optional(),
   })
 });


 export {
    registerSchema,
    loginSchema
 }