import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";

export const config = { path: "/api/*" };

const db = getDatabase();
const uploadStore = getStore("forge-report-attachments");
const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"]);
const maxFileSize = 5 * 1024 * 1024;

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function error(message, status = 400) { return json({ message }, status); }
function safeDate(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}
function reportShape(r) {
  return {
    id: r.id,
    projectTitle: r.project_title,
    department: r.department,
    site: r.site,
    submittedBy: r.submitted_by,
    projectStatus: r.project_status,
    projectSummary: r.project_summary,
    challenges: r.challenges,
    nextSteps: r.next_steps,
    importance: r.importance,
    dueDate: r.due_date,
    reportingDate: r.reporting_date,
    reviewStatus: r.review_status,
    adminFeedback: r.admin_feedback,
    attachmentFileName: r.attachment_file_name,
    attachmentFilePath: r.attachment_file_path
  };
}
const reportSelect = `
  SELECT r.id, r.project_title, d.name AS department, d.site,
         u.full_name AS submitted_by, r.project_status, r.project_summary,
         r.challenges, r.next_steps, r.importance, r.due_date,
         r.reporting_date, r.review_status, r.admin_feedback,
         r.attachment_file_name, r.attachment_file_path
  FROM reports r
  JOIN departments d ON d.id = r.department_id
  JOIN users u ON u.id = r.submitted_by_id`;

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const method = request.method.toUpperCase();

    if (method === "GET" && path === "/api/health") {
      await db.sql`SELECT 1 AS ok`;
      return json({ status: "ok", service: "Forge Report API", database: "connected" });
    }

    // Login intentionally preserves the original demo behavior: email identifies
    // a seeded user; the password field is not validated in this test build.
    if (method === "POST" && path.toLowerCase() === "/api/auth/login") {
      const body = await request.json();
      const email = String(body.email || "").trim();
      if (!email) return error("Email is required.");
      const rows = await db.sql`
        SELECT u.id, u.full_name, u.email, u.role, u.department_id,
               d.name AS department, d.site
        FROM users u JOIN departments d ON d.id = u.department_id
        WHERE lower(u.email) = lower(${email}) LIMIT 1`;
      const user = rows[0];
      if (!user) return error("Invalid email address.", 401);
      return json({ message: "Login successful.", user: {
        id: user.id, name: user.full_name, email: user.email, role: user.role,
        departmentId: user.department_id, department: user.department, site: user.site
      }});
    }

    if (method === "GET" && path.toLowerCase() === "/api/reports") {
      const rows = await db.sql`
        SELECT r.id, r.project_title, d.name AS department, d.site,
               u.full_name AS submitted_by, r.project_status, r.project_summary,
               r.challenges, r.next_steps, r.importance, r.due_date,
               r.reporting_date, r.review_status, r.admin_feedback,
               r.attachment_file_name, r.attachment_file_path
        FROM reports r JOIN departments d ON d.id=r.department_id
        JOIN users u ON u.id=r.submitted_by_id
        ORDER BY r.reporting_date DESC`;
      return json(rows.map(reportShape));
    }

    const userReports = path.match(/^\/api\/reports\/user\/(\d+)$/i);
    if (method === "GET" && userReports) {
      const userId = Number(userReports[1]);
      const rows = await db.sql`
        SELECT r.id, r.project_title, d.name AS department, d.site,
               u.full_name AS submitted_by, r.project_status, r.project_summary,
               r.challenges, r.next_steps, r.importance, r.due_date,
               r.reporting_date, r.review_status, r.admin_feedback,
               r.attachment_file_name, r.attachment_file_path
        FROM reports r JOIN departments d ON d.id=r.department_id
        JOIN users u ON u.id=r.submitted_by_id
        WHERE r.submitted_by_id=${userId} ORDER BY r.reporting_date DESC`;
      return json(rows.map(reportShape));
    }

    if (method === "POST" && path.toLowerCase() === "/api/reports") {
      const b = await request.json();
      const required = ["projectTitle", "projectSummary", "challenges", "nextSteps", "projectStatus"];
      if (required.some(k => !String(b[k] || "").trim())) return error("Please complete all required report fields.");
      const departmentId = Number(b.departmentId), userId = Number(b.submittedById);
      if (!departmentId || !userId) return error("The user session is incomplete. Please log in again.", 400);
      const validUser = await db.sql`SELECT id FROM users WHERE id=${userId} AND department_id=${departmentId} LIMIT 1`;
      if (!validUser.length) return error("The selected user and department do not match.", 403);
      const rows = await db.sql`
        INSERT INTO reports (project_title,department_id,submitted_by_id,project_status,project_summary,challenges,next_steps,importance,due_date,reporting_date,review_status)
        VALUES (${String(b.projectTitle).trim()},${departmentId},${userId},${String(b.projectStatus)},${String(b.projectSummary).trim()},${String(b.challenges).trim()},${String(b.nextSteps).trim()},${String(b.importance || "Important")},${safeDate(b.dueDate)},NOW(),'Pending')
        RETURNING id`;
      return json({ message: "Report submitted successfully.", reportId: rows[0].id });
    }

    const reviewMatch = path.match(/^\/api\/reports\/(\d+)\/review$/i);
    if (method === "PUT" && reviewMatch) {
      const id = Number(reviewMatch[1]);
      const b = await request.json();
      if (!["Approved", "Rejected"].includes(b.reviewStatus)) return error("Review status must be Approved or Rejected.");
      const rows = await db.sql`
        UPDATE reports SET review_status=${b.reviewStatus}, admin_feedback=${b.adminFeedback || null}
        WHERE id=${id} RETURNING id`;
      if (!rows.length) return error("Report not found.", 404);
      return json({ message: `Report ${b.reviewStatus.toLowerCase()} successfully.` });
    }

    const resubmitMatch = path.match(/^\/api\/reports\/(\d+)\/resubmit$/i);
    if (method === "PUT" && resubmitMatch) {
      const id = Number(resubmitMatch[1]);
      const b = await request.json();
      const required = ["projectTitle", "projectSummary", "challenges", "nextSteps", "projectStatus"];
      if (required.some(k => !String(b[k] || "").trim())) return error("Please complete all required report fields.");
      const rows = await db.sql`
        UPDATE reports SET project_title=${String(b.projectTitle).trim()}, project_status=${String(b.projectStatus)},
          project_summary=${String(b.projectSummary).trim()}, challenges=${String(b.challenges).trim()},
          next_steps=${String(b.nextSteps).trim()}, importance=${String(b.importance || "Important")},
          due_date=${safeDate(b.dueDate)}, reporting_date=NOW(), review_status='Pending', admin_feedback=NULL
        WHERE id=${id} AND review_status='Rejected' RETURNING id`;
      if (!rows.length) return error("Report not found or it is not currently rejected.", 404);
      return json({ message: "Report resubmitted successfully.", reportId: rows[0].id });
    }

    const attachmentMatch = path.match(/^\/api\/reports\/(\d+)\/attachment$/i);
    if (method === "POST" && attachmentMatch) {
      const reportId = Number(attachmentMatch[1]);
      const exists = await db.sql`SELECT id FROM reports WHERE id=${reportId} LIMIT 1`;
      if (!exists.length) return error("Report not found.", 404);
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function" || !file.size) return error("Please select a file.");
      if (file.size > maxFileSize) return error("The maximum file size is 5 MB.");
      const originalName = String(file.name || "attachment");
      const extension = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")).toLowerCase() : "";
      if (!allowedExtensions.has(extension)) return error("Allowed files: PDF, Word, Excel, PNG and JPG.");
      const key = crypto.randomUUID();
      await uploadStore.set(key, file, { metadata: { originalName, contentType: file.type || "application/octet-stream" } });
      await db.sql`UPDATE reports SET attachment_file_name=${originalName}, attachment_file_path=${key} WHERE id=${reportId}`;
      return json({ message: "Attachment uploaded successfully.", fileName: originalName });
    }

    const uploadMatch = path.match(/^\/api\/uploads\/([a-f0-9-]+)$/i);
    if (method === "GET" && uploadMatch) {
      const key = uploadMatch[1];
      const rows = await db.sql`SELECT attachment_file_name FROM reports WHERE attachment_file_path=${key} LIMIT 1`;
      if (!rows.length) return error("Attachment not found.", 404);
      const file = await uploadStore.get(key, { type: "blob" });
      if (!file) return error("Attachment not found.", 404);
      const ext = (rows[0].attachment_file_name || "").split(".").pop().toLowerCase();
      const mime = ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })[ext] || "application/octet-stream";
      return new Response(file, { headers: { "Content-Type": mime, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(rows[0].attachment_file_name || "attachment")}`, "Cache-Control": "private, no-store" } });
    }

    return error("API endpoint not found.", 404);
  } catch (err) {
    console.error("Forge API error:", err);
    return error("The server could not complete this request. Check the Netlify function logs for details.", 500);
  }
}
