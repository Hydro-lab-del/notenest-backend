import { ApiResponse } from "../../utils/ApiResponse.js";
import { Note } from "../../models/note.model.js";
import { ApiError } from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import mongoose from "mongoose";



const performTrashCleanup = async (userId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return await Note.deleteMany({
        userId,
        isTrashed: true,
        deletedAt: { $lte: thirtyDaysAgo }
    });
};

const getNotes = asyncHandler(async (req, res) => {
    const { search, page = 1, limit = 12, view = "all" } = req.query;
    const userId = req.user.id;

    // 1. Filter Setup
    const query = { userId };

    if (view === "favorites") {
        query.isArchived = true;
        query.isTrashed = false;
    } else if (view === "trash") {
        query.isTrashed = true;

        await performTrashCleanup(userId)
    } else if (view === "reminders") {
        query.reminderTime = { $ne: null };
        query.isTrashed = false;
    } else {
        query.isArchived = false;
        query.isTrashed = false;
    }

    // 3. Search parameters
    if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
            { title: searchRegex },
            { content: searchRegex }
        ];
    }

    // 4. Safely parse and calculate pagination parameters after potential cleanup
    const parsedLimit = parseInt(limit) || 12;
    const totalNotes = await Note.countDocuments(query);

    // Safety net: If background deletion emptied the page, don't let skip go negative
    const totalPages = Math.ceil(totalNotes / parsedLimit) || 1;
    const targetPage = Math.min(parseInt(page) || 1, totalPages);
    const skip = (targetPage - 1) * parsedLimit;

    // 5. Database read pipeline (.lean() for raw JSON performance)
    const notes = await Note.find(query)
        .sort({ isPinned: -1, updatedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

    res.status(200).json(new ApiResponse(200, {
        notes,
        totalNotes,
        totalPages
    }, "Notes retrieved successfully"));
});


const createNote = asyncHandler(async (req, res) => {

    const { title, content, type, bgColor, items, reminderTime, reminderRepeat } = req.body;
    const userId = req.user.id;

    if (type === "NOTE" && !title?.trim() && !content?.trim()) {
        throw new ApiError(400, "Note must have a title or content");
    }

    if (type === "TODO" && !title?.trim() && (!items || items.length === 0)) {
        throw new ApiError(400, "Todo list must have a title or at least one item");
    }

    const finalTitle = title?.trim() || "Untitled Note";

    const isTodo = type === "TODO";

    const validTypes = ["NOTE", "TODO"];
    if (type && !validTypes.includes(type)) {
        throw new ApiError(400, "Invalid note type. Must be NOTE or TODO.");
    }

    const note = await Note.create({
        title: finalTitle,
        content: !isTodo ? content : '',
        type,
        items: isTodo ? items : [],
        bgColor,
        userId,
        reminderTime: reminderTime ? new Date(reminderTime) : null,
        reminderRepeat: reminderRepeat || 'NONE',
        reminderTriggered: false,
        reminderNotified: false
    });

    res
        .status(201)
        .json(new ApiResponse(201, { note }, "Note created successfully"))
});

const togglePin = asyncHandler(async (req, res) => {

    // Find note.
    // Check if it exists.
    // Check if it belongs to the user.
    // Toggle.

    const { noteId } = req.params; //its an object not string
    const userId = req.user.id; //its an object not string

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
        throw new ApiError(400, "Invalid Note ID format");
    }

    const note = await Note.findById(noteId);
    // note.userId !== userId it will always return true two object cannot be compared using !==

    if (!note) {
        throw new ApiError(404, "Note not found")
    }
    if (note.userId.toString() !== userId.toString()) {
        throw new ApiError(403, "You do not have permission to pin this note");
    }

    note.isPinned = !note.isPinned;


    await note.save();

    res
        .status(200)
        .json(new ApiResponse(200, note, "Pin toggled successfully!"));
});

const toggleIsArchived = asyncHandler(async (req, res) => {

    // Find note.
    // Check if it exists.
    // Check if it belongs to the user.
    // Toggle.

    const { noteId } = req.params; //its an object not string
    const userId = req.user.id; //its an object not string

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
        throw new ApiError(400, "Invalid Note ID format");
    }

    const note = await Note.findById(noteId);
    // note.userId !== userId it will always return true two object cannot be compared using !==

    if (!note) {
        throw new ApiError(404, "Note not found")
    }
    if (note.userId.toString() !== userId.toString()) {
        throw new ApiError(403, "You do not have permission to pin this note");
    }

    note.isArchived = !note.isArchived;


    await note.save();

    res
        .status(200)
        .json(new ApiResponse(200, note, "Favroite toggled successfully!"));
});

const toggleTodoItem = asyncHandler(async (req, res) => {
    const { noteId, itemIndex } = req.params;
    const userId = req.user.id;
    const note = await Note.findOne({ _id: noteId, userId: userId });

    if (!note) {
        throw new ApiError(404, "Note not found");
    }
    if (note.type !== 'TODO') {
        throw new ApiError(400, "This is not a To-Do note");
    }

    const currentStatus = note.items[itemIndex].completed;
    note.items[itemIndex].completed = !currentStatus;

    note.markModified('items');
    await note.save();

    res
        .status(200)
        .json(new ApiResponse(200, { items: note.items }, "Status updated"))
});

const updateNote = asyncHandler(async (req, res) => {
    const { title, content, type, bgColor, items, isPinned, reminderTime, reminderRepeat } = req.body;
    const { noteId } = req.params;
    const userId = req.user.id;

    const note = await Note.findOne({ _id: noteId, userId: userId })

    if (!note) {
        throw new ApiError(404, "Note not found or unauthorized");
    }

    const updatedNoteFields = {};

    if (title !== undefined) updatedNoteFields.title = title;

    if (bgColor !== undefined) updatedNoteFields.bgColor = bgColor;

    if (isPinned !== undefined) updatedNoteFields.isPinned = isPinned;

    if (reminderTime !== undefined) {
        updatedNoteFields.reminderTime = reminderTime ? new Date(reminderTime) : null;
        updatedNoteFields.reminderTriggered = false;
        updatedNoteFields.reminderNotified = false;
    }
    if (reminderRepeat !== undefined) {
        updatedNoteFields.reminderRepeat = reminderRepeat;
    }

    if (type === "NOTE") {
        updatedNoteFields.type = "NOTE";
        updatedNoteFields.content = content ?? note.content;
        updatedNoteFields.items = [];
    } else if (type === "TODO") {
        updatedNoteFields.type = "TODO";
        updatedNoteFields.items = items ?? note.items;
        updatedNoteFields.content = "";
    }


    const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        { $set: updatedNoteFields },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, { updatedNote }, "Note updated successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {

    const { noteId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
        throw new ApiError(400, "Invalid Note ID format");
    }

    const note = await Note.findOne({ _id: noteId, userId: userId });

    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    await Note.deleteOne({ _id: noteId, userId: userId });

    return res
        .status(200)
        .json(new ApiResponse(200, { success: true }, "Note deleted successfuly!"));
});

const trashNote = asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;
    const note = await Note.findOne({ _id: noteId, userId });

    if (!note) {
        throw new ApiError(404, "Note not found or unauthorized");
    }

    if (note.isTrashed) {
        throw new ApiError(400, "Note is already in the trash bin")
    }

    note.isPinned = false;
    note.isTrashed = true;
    note.deletedAt = new Date();

    await note.save();

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note moved to trash successfully"))

});

const restoreNote = asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;

    const note = await Note.findOne({ _id: noteId, userId });

    if (!note) {
        throw new ApiError(404, "Note not found or unauthorized");
    }

    if (!note.isTrashed) {
        throw new ApiError(400, "Note is not in the trash bin")
    }

    note.isTrashed = false;
    note.deletedAt = null;

    await note.save();

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note restored successfully"));
});


const emptyTrashbin = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await Note.deleteMany({ userId, isTrashed: true });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { deletedCount: result.deletedCount },
                "Trash emptied successfully"
            )
        );
});




const getNextReminderTime = (time, repeat) => {
    const next = new Date(time);
    const now = new Date();
    while (next <= now) {
        if (repeat === 'DAILY') {
            next.setDate(next.getDate() + 1);
        } else if (repeat === 'WEEKLY') {
            next.setDate(next.getDate() + 7);
        } else if (repeat === 'MONTHLY') {
            next.setMonth(next.getMonth() + 1);
        } else {
            break;
        }
    }
    return next;
};

const setReminder = asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const { reminderTime, reminderRepeat } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
        throw new ApiError(400, "Invalid Note ID format");
    }

    const note = await Note.findOne({ _id: noteId, userId });

    if (!note) {
        throw new ApiError(404, "Note not found or unauthorized");
    }

    if (reminderTime) {
        note.reminderTime = new Date(reminderTime);
        note.reminderTriggered = false;
        note.reminderNotified = false;
        note.reminderRepeat = reminderRepeat || 'NONE';
    } else {
        note.reminderTime = null;
        note.reminderTriggered = false;
        note.reminderNotified = false;
        note.reminderRepeat = 'NONE';
    }

    await note.save();

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Reminder updated successfully"));
});

const getDueReminders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const now = new Date();

    // Find notes where reminderTime is in the past and they haven't been notified yet.
    const dueNotes = await Note.find({
        userId,
        reminderTime: { $ne: null, $lte: now },
        reminderNotified: false,
        isTrashed: false
    });

    // Process and update each due note
    const processedNotes = [];
    for (const note of dueNotes) {
        processedNotes.push({
            _id: note._id,
            title: note.title,
            content: note.content,
            reminderTime: note.reminderTime,
            reminderRepeat: note.reminderRepeat
        });

        if (note.reminderRepeat && note.reminderRepeat !== 'NONE') {
            note.reminderTime = getNextReminderTime(note.reminderTime, note.reminderRepeat);
            note.reminderTriggered = false;
            note.reminderNotified = false;
        } else {
            note.reminderNotified = true;
        }
        await note.save();
    }

    return res
        .status(200)
        .json(new ApiResponse(200, processedNotes, "Due reminders fetched successfully"));
});

export {
    getNotes,
    createNote,
    togglePin,
    toggleIsArchived,
    toggleTodoItem,
    updateNote,
    deleteNote,
    trashNote,
    restoreNote,
    emptyTrashbin,
    setReminder,
    getDueReminders
};