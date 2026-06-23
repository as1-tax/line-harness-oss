interface FriendAssignment {
  primary_staff_id: string | null;
  secondary_staff_id: string | null;
}

interface StaffWebhook {
  discord_webhook_url: string | null;
}

export async function notifyAssignedStaff(
  db: D1Database,
  friendId: string,
  friendName: string | null,
  messageContent: string,
  adminBaseUrl: string,
): Promise<void> {
  const assignment = await db
    .prepare('SELECT primary_staff_id, secondary_staff_id FROM friends WHERE id = ?')
    .bind(friendId)
    .first<FriendAssignment>();

  if (!assignment) return;

  const staffIds = new Set<string>();
  if (assignment.primary_staff_id) staffIds.add(assignment.primary_staff_id);
  if (assignment.secondary_staff_id) staffIds.add(assignment.secondary_staff_id);
  if (staffIds.size === 0) return;

  const chatUrl = `${adminBaseUrl}/chats?friend=${friendId}`;
  const name = friendName ?? '名前なし';
  const preview = messageContent.length > 100 ? `${messageContent.slice(0, 100)}…` : messageContent;
  const bodyText = `📩 **${name}** からメッセージが届きました\n> ${preview}\nチャット: ${chatUrl}`;

  for (const staffId of staffIds) {
    try {
      const staff = await db
        .prepare('SELECT discord_webhook_url FROM staff_members WHERE id = ?')
        .bind(staffId)
        .first<StaffWebhook>();

      if (!staff?.discord_webhook_url) continue;

      const res = await fetch(staff.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: bodyText }),
      });

      if (!res.ok) {
        console.error(`[discord] webhook failed for staff ${staffId}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`[discord] notification error for staff ${staffId}:`, err);
    }
  }
}
