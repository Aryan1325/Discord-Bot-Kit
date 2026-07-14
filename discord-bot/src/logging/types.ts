/**
 * The logging framework's event catalog. These are the log categories the
 * framework is *ready* to handle — actual event listeners that call
 * `dispatchLog()` for each of these are wired up in a later pass. For now
 * this file plus `logger.ts` provide the reusable plumbing: settings
 * storage, enable/disable per event, and a branded embed dispatcher.
 */
export enum LogEventType {
  MessageDelete = "message_delete",
  MessageEdit = "message_edit",
  MemberJoin = "member_join",
  MemberLeave = "member_leave",
  RoleChange = "role_change",
  ChannelChange = "channel_change",
  NicknameChange = "nickname_change",
  ModerationAction = "moderation_action",
  TicketCreated = "ticket_created",
  TicketClosed = "ticket_closed",
  TicketDeleted = "ticket_deleted",
  TicketRenamed = "ticket_renamed",
  TicketMembersAdded = "ticket_members_added",
  TicketMembersRemoved = "ticket_members_removed",
  TicketTranscriptGenerated = "ticket_transcript_generated",
}

export const LOG_EVENT_LABELS: Record<LogEventType, string> = {
  [LogEventType.MessageDelete]: "Message Delete",
  [LogEventType.MessageEdit]: "Message Edit",
  [LogEventType.MemberJoin]: "Member Join",
  [LogEventType.MemberLeave]: "Member Leave",
  [LogEventType.RoleChange]: "Role Change",
  [LogEventType.ChannelChange]: "Channel Change",
  [LogEventType.NicknameChange]: "Nickname Change",
  [LogEventType.ModerationAction]: "Moderation Action",
  [LogEventType.TicketCreated]: "Ticket Created",
  [LogEventType.TicketClosed]: "Ticket Closed",
  [LogEventType.TicketDeleted]: "Ticket Deleted",
  [LogEventType.TicketRenamed]: "Ticket Renamed",
  [LogEventType.TicketMembersAdded]: "Ticket Members Added",
  [LogEventType.TicketMembersRemoved]: "Ticket Members Removed",
  [LogEventType.TicketTranscriptGenerated]: "Ticket Transcript Generated",
};

export interface LogPayload {
  title?: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}
