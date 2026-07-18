import { Router } from "express";
import { createNote, deleteNote, emptyTrashbin, getNotes, restoreNote, toggleIsArchived, togglePin, toggleTodoItem, trashNote, updateNote, setReminder, getDueReminders } from "../controllers/notes/notes.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { updateNoteSchema } from "../controllers/notes/noteSchema.js";


const router = Router();
router.use(verifyJWT);

router.route('/').post(validate(updateNoteSchema), createNote);//create note
router.route('/').get(getNotes); //get all notes
router.route('/trash/empty').delete(emptyTrashbin);


router.route('/pin/:noteId').patch(togglePin); //toggle pin
router.route('/favorite/:noteId').patch(toggleIsArchived); //toggle archived
router.route('/toggle-todo/:noteId/:itemIndex').patch(toggleTodoItem) //toggle item
router.route('/:noteId').patch(validate(updateNoteSchema), updateNote)//update note
router.route('/delete-permanent/:noteId').delete(deleteNote);//delete note

router.route('/trash/:noteId').patch(trashNote);

router.route('/restore/:noteId').put(restoreNote);
router.route('/reminder/:noteId').patch(setReminder);
router.route('/reminders/due').get(getDueReminders);

export default router;