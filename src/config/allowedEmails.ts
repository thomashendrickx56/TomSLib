export const allowedEmails: string[] = [];

export function isEmailAllowed(email: string): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const e = email.trim().toLowerCase();
  if (admin && e === admin) return true;
  return allowedEmails.map((x) => x.trim().toLowerCase()).includes(e);
}
// Add allowed email addresses to the array below
allowedEmails.push("thomas.hendrickxgresse@indse.be");
allowedEmails.push("thomashendrixkw@gmail.com");
