import { Note } from "../models/note.model.js";
import { sendEmail } from "./email.js";

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

export const startReminderCron = () => {
    // Run every 60 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            // Find notes with active, due reminders that haven't been triggered on backend yet
            const notes = await Note.find({
                reminderTime: { $ne: null, $lte: now },
                reminderTriggered: false,
                isTrashed: false
            }).populate("userId");

            for (const note of notes) {
                console.log(`[Cron] Triggering reminder for Note ID: ${note._id}, User: ${note.userId?.email}`);
                
                // 1. Mark triggered (advance time for repeating reminders)
                if (note.reminderRepeat && note.reminderRepeat !== 'NONE') {
                    note.reminderTime = getNextReminderTime(note.reminderTime, note.reminderRepeat);
                    note.reminderTriggered = false;
                    note.reminderNotified = false;
                } else {
                    note.reminderTriggered = true;
                }
                await note.save();

                // 2. Send email if user has email
                if (note.userId && note.userId.email) {
                    const userEmail = note.userId.email;
                    const subject = `⏰ Reminder: ${note.title || "Untitled Note"}`;
                    const html = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                            <div style="background-color: #7c3aed; color: #ffffff; padding: 20px; text-align: center;">
                                <h1 style="margin: 0; font-size: 24px;">NoteNest Reminder</h1>
                            </div>
                            <div style="padding: 24px; color: #333333;">
                                <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
                                <p style="font-size: 16px; line-height: 1.5;">This is a reminder for your note:</p>
                                <div style="background-color: #f9f9f9; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 4px;">
                                    <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111111;">${note.title || "Untitled Note"}</h3>
                                    <p style="margin: 0; font-size: 14px; color: #555555; white-space: pre-wrap;">${note.content || ""}</p>
                                </div>
                                <p style="font-size: 12px; color: #777777; margin-top: 30px;">
                                    Reminder Settings: ${note.reminderRepeat !== 'NONE' ? `Repeating ${note.reminderRepeat}` : 'One-time'}
                                </p>
                            </div>
                            <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #e0e0e0;">
                                &copy; ${new Date().getFullYear()} NoteNest. All rights reserved.
                            </div>
                        </div>
                    `;
                    try {
                        await sendEmail(userEmail, subject, html);
                        console.log(`[Cron] Email sent successfully to ${userEmail}`);
                    } catch (emailErr) {
                        console.error(`[Cron] Failed to send email to ${userEmail}:`, emailErr);
                    }
                }
            }
        } catch (err) {
            console.error("[Cron] Error running reminder cron job:", err);
        }
    }, 60000);

    console.log("[Cron] Reminder cron service started (60s interval)");
};
