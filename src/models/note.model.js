import { Schema, model } from "mongoose";

// This stores individual items for the separate "TODO List" feature
const noteItemSchema = new Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const noteSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    // THIS FIELD STORES THE ENTIRE RICH TEXT (Bold, Italic, Colors, Lists)
    content: {
      type: String,
      trim: true,
    },
    // 'NOTE' uses the content field, 'TODO' uses the items array
    type: {
      type: String,
      enum: ['NOTE', 'TODO'],
      default: 'NOTE',
    },
    // The Tailwind class for the CARD's background (e.g., 'bg-red-50')
    bgColor: {
      type: String,
      default: "bg-white",
    },
    // Used specifically for the checklist feature
    items: [noteItemSchema],

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean, 
      default: false,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null
    },
    reminderTime: {
      type: Date,
      default: null
    },
    reminderTriggered: {
      type: Boolean,
      default: false
    },
    reminderNotified: {
      type: Boolean,
      default: false
    },
    reminderRepeat: {
      type: String,
      enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'],
      default: 'NONE'
    },
  },
  { timestamps: true }
);

export const Note = model("Note", noteSchema);
