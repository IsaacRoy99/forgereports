const API_URL = "/api";


// ======================================================
// LOGIN PROTECTION
// ======================================================

const currentPage = window.location.pathname;

if (
    (currentPage.endsWith("index.html") || currentPage.endsWith("/")) &&
    sessionStorage.getItem("loggedIn") !== "true"
) {
    window.location.href = "login.html";
}


// ======================================================
// STATUS BADGES
// ======================================================

function getStatusBadge(status) {

    if (status === "Completed")
        return "success";

    if (status === "Blocked")
        return "danger";

    if (status === "On Hold")
        return "warning";

    return "primary";
}

function getReviewBadge(status) {

    if (status === "Approved")
        return "success";

    if (status === "Rejected")
        return "danger";

    return "warning";
}


// ======================================================
// LOGIN
// ======================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const email = document
            .querySelector("#loginForm input[type='email']")
            .value
            .trim();

        const password = document
            .querySelector("#loginForm input[type='password']")
            .value
            .trim();

        if (email === "" || password === "") {

            Swal.fire({
                title: "Missing Information",
                text: "Please enter your email and password.",
                icon: "error",
                confirmButtonColor: "#d33"
            });

            return;
        }

        try {

            const response = await fetch(`${API_URL}/Auth/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {

                Swal.fire({
                    title: "Login Failed",
                    text: data.message || "Invalid login details.",
                    icon: "error",
                    confirmButtonColor: "#d33"
                });

                return;
            }

            // Save user session
            sessionStorage.setItem("loggedIn", "true");
            sessionStorage.setItem("userId", data.user.id);
            sessionStorage.setItem("userName", data.user.name);
            sessionStorage.setItem("userEmail", data.user.email);
            sessionStorage.setItem("userRole", data.user.role);
            sessionStorage.setItem("departmentId", data.user.departmentId);
            sessionStorage.setItem("department", data.user.department);
            sessionStorage.setItem("site", data.user.site);

            // Admin goes to admin dashboard
            if (data.user.role === "Admin") {

                window.location.href = "admin.html";

            } else {

                window.location.href = "index.html";
            }

        } catch (error) {

            console.error(error);

            Swal.fire({
                title: "Connection Error",
                text: "Could not connect to the reporting server. Please try again in a moment.",
                icon: "error",
                confirmButtonColor: "#d33"
            });
        }
    });
}


// ======================================================
// REPORT FORM
// ======================================================

const reportForm = document.getElementById("reportForm");

if (reportForm) {

    reportForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const title = document.getElementById("reportTitle").value.trim();
        const team = document.getElementById("team").value.trim();
        const status = document.getElementById("status").value.trim();

        const summary = document.getElementById("reportSummary")?.value.trim() || "";
        const challenges = document.getElementById("reportChallenges")?.value.trim() || "";
        const progress = document.getElementById("reportProgress")?.value.trim() || "";

        const dateInput = document.getElementById("reportDate");

        const dueDate =
            dateInput?.value ||
            new Date().toISOString().split("T")[0];

        const importanceElement =
            document.getElementById("importance");

        const importance =
            importanceElement?.value || "Important";

        // attach file  
        const attachmentFile = document.getElementById("attachmentFile")?.files[0];  

        // Validate form
        if (
            title === "" ||
            team === "" ||
            status === "" ||
            summary === "" ||
            challenges === "" ||
            progress === ""
        ) {
            Swal.fire({
                title: "Missing Information",
                text: "Please complete all required fields before submitting.",
                icon: "error",
                confirmButtonColor: "#d33"
            });

            return;
        }

        const userId =
            Number(sessionStorage.getItem("userId"));

        const departmentId =
            Number(sessionStorage.getItem("departmentId"));

        if (!userId || !departmentId) {

            Swal.fire({
                title: "Session Error",
                text: "Please log in again.",
                icon: "error"
            });

            return;
        }

        // Report data
        const report = {
            projectTitle: title,
            departmentId: departmentId,
            submittedById: userId,
            projectStatus: status,
            projectSummary: summary,
            challenges: challenges,
            nextSteps: progress,
            importance: importance,
            dueDate: dueDate,
            reportingDate: new Date().toISOString(),
            reviewStatus: "Pending"
        };

        const editingReportId =
            reportForm.dataset.editingReportId;

        try {

            let response;

            // Resubmitting rejected report
            if (editingReportId) {

                response = await fetch(
                    `${API_URL}/Reports/${editingReportId}/resubmit`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(report)
                    }
                );

            } else {

                // Creating new report
                response = await fetch(
                    `${API_URL}/Reports`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(report)
                    }
                );
            }

            const data = await response.json();

            if (!response.ok) {

                Swal.fire({
                    title: editingReportId
                        ? "Resubmission Failed"
                        : "Submission Failed",

                    text: data.message ||
                        "Could not submit the report.",

                    icon: "error"
                });

                return;
            }

            // Upload attachment if a file was selected
if (attachmentFile) {

    const reportId = editingReportId || data.reportId;

    const formData = new FormData();
    formData.append("file", attachmentFile);

    const uploadResponse = await fetch(
        `${API_URL}/Reports/${reportId}/attachment`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();

        Swal.fire({
            title: "Attachment Upload Failed",
            text: uploadError.message || "The report was saved, but its attachment could not be uploaded.",
            icon: "error"
        });

        return;
    }
}

            // Success message
            if (editingReportId) {

                Swal.fire({
                    title: "Report Resubmitted!",
                    html:
                        `<b>Your report has been updated and resubmitted for review.</b>
                        <br><br>
                        Report #${editingReportId}`,

                    icon: "success",
                    confirmButtonText: "Close",
                    confirmButtonColor: "#fca311",
                    allowOutsideClick: false
                });

            } else {

                Swal.fire({
                    title: "Report Submitted!",
                    html:
                        `<b>Your department report was submitted successfully.</b>
                        <br><br>
                        Report #${data.reportId}
                        <br><br>
                        The report has been forwarded for managerial review.`,

                    icon: "success",
                    confirmButtonText: "Close",
                    confirmButtonColor: "#fca311",
                    allowOutsideClick: false
                });
            }

            // Exit edit mode
            delete reportForm.dataset.editingReportId;

            // Reset form and return to the reports overview
            reportForm.reset();
            closeReportForm();

            // Restore submit button
            const submitButton =
                document.getElementById("submitBtn");

            submitButton.innerHTML = "Submit Report";

            submitButton.classList.remove("btn-success");
            submitButton.classList.add("btn-warning");

            // Refresh reports
            loadReports();
            updateStats();

        } catch (error) {

            console.error(error);

            Swal.fire({
                title: "Connection Error",
                text: "Could not connect to the reporting server.",
                icon: "error"
            });
        }
    });
}

// ======================================================
// SIMPLE DASHBOARD: ADD / CLOSE REPORT FORM
// ======================================================

let cachedUserReports = [];

function openReportForm() {
    const formCard = document.getElementById("reportFormCard");
    const heading = document.getElementById("reportFormHeading");
    if (!formCard) return;
    formCard.classList.remove("d-none");
    if (heading && !document.getElementById("reportForm")?.dataset.editingReportId) {
        heading.textContent = "Submit New Report";
    }
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("reportTitle")?.focus({ preventScroll: true });
}

function closeReportForm() {
    const formCard = document.getElementById("reportFormCard");
    if (formCard) formCard.classList.add("d-none");
    const heading = document.getElementById("reportFormHeading");
    if (heading) heading.textContent = "Submit New Report";
}

document.getElementById("addReportButton")?.addEventListener("click", () => {
    const form = document.getElementById("reportForm");
    if (form?.dataset.editingReportId) delete form.dataset.editingReportId;
    form?.reset();
    const submitButton = document.getElementById("submitBtn");
    if (submitButton) {
        submitButton.textContent = "Submit Report";
        submitButton.classList.remove("btn-success");
        submitButton.classList.add("btn-warning");
    }
    openReportForm();
});

document.getElementById("closeReportFormButton")?.addEventListener("click", closeReportForm);
document.getElementById("cancelReportButton")?.addEventListener("click", closeReportForm);

function renderUserReports() {
    const table = document.getElementById("reportTable");
    if (!table) return;
    table.innerHTML = "";
    if (!cachedUserReports.length) {
        table.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No reports found yet. Select <strong>Add Report</strong> to submit your first report.</td></tr>`;
        return;
    }

    cachedUserReports.forEach(report => {
        let actionButton = `<button class="btn btn-sm btn-outline-dark" onclick="viewReportDetails(${Number(report.id)})"><i class="fa-regular fa-eye me-1"></i> View</button>`;
        if (report.reviewStatus === "Rejected") {
            actionButton += ` <button class="btn btn-sm btn-warning fw-semibold" onclick="editRejectedReport(${Number(report.id)})"><i class="fa-solid fa-pen-to-square me-1"></i>Edit &amp; Resubmit</button>`;
        }
        table.innerHTML += `<tr>
          <td><strong>${escapeHtml(report.projectTitle)}</strong><br><small class="text-muted">${escapeHtml(report.reportingDate ? new Date(report.reportingDate).toLocaleDateString() : "")}</small></td>
          <td>${escapeHtml(report.department)}</td>
          <td><span class="badge bg-${getStatusBadge(report.projectStatus)}">${escapeHtml(report.projectStatus)}</span></td>
          <td><span class="badge bg-${getReviewBadge(report.reviewStatus)}">${escapeHtml(report.reviewStatus)}</span>${report.adminFeedback ? `<br><small class="text-muted">Feedback: ${escapeHtml(report.adminFeedback)}</small>` : ""}</td>
          <td>${actionButton}</td>
        </tr>`;
    });
    applyReportSearch();
}

function applyReportSearch() {
    const value = (document.getElementById("searchInput")?.value || "").toLowerCase();
    document.querySelectorAll("#reportTable tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(value) ? "" : "none";
    });
}

async function viewReportDetails(reportId) {
    const report = cachedUserReports.find(item => Number(item.id) === Number(reportId));
    if (!report) return;
    const attachment = report.attachmentFilePath
        ? `<p><strong>Attachment:</strong> <a href="${API_URL}/uploads/${encodeURIComponent(report.attachmentFilePath)}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.attachmentFileName || "Open attachment")}</a></p>`
        : "<p><strong>Attachment:</strong> None</p>";
    await Swal.fire({
        title: escapeHtml(report.projectTitle),
        width: 720,
        confirmButtonColor: "#f47721",
        html: `<div class="text-start report-detail-modal">
          <p><strong>Department:</strong> ${escapeHtml(report.department)}</p>
          <p><strong>Project status:</strong> ${escapeHtml(report.projectStatus)}</p>
          <p><strong>Review status:</strong> ${escapeHtml(report.reviewStatus)}</p>
          <p><strong>Importance:</strong> ${escapeHtml(report.importance || "Not specified")}</p>
          <hr><p><strong>Summary</strong><br>${escapeHtml(report.projectSummary)}</p>
          <p><strong>Challenges</strong><br>${escapeHtml(report.challenges)}</p>
          <p><strong>Progress update / next steps</strong><br>${escapeHtml(report.nextSteps)}</p>
          ${report.adminFeedback ? `<div class="alert alert-warning"><strong>Reviewer feedback</strong><br>${escapeHtml(report.adminFeedback)}</div>` : ""}
          ${attachment}
        </div>`
    });
}

// ======================================================
// LOAD DEPARTMENT HEAD REPORTS
// ======================================================

async function loadReports() {
    const table = document.getElementById("reportTable");
    if (!table) return;
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;
    try {
        const response = await fetch(`${API_URL}/Reports/user/${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error("Could not retrieve reports.");
        cachedUserReports = await response.json();
        if (!Array.isArray(cachedUserReports)) cachedUserReports = [];
        renderUserReports();
        updateStats();
    } catch (error) {
        console.error("Could not load reports:", error);
        table.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Could not load reports. Please refresh the page.</td></tr>`;
    }
}

// ======================================================
// DASHBOARD STATS
// ======================================================

async function updateStats() {

    const submitted =
        document.getElementById("reportsSubmitted");

    const pending =
        document.getElementById("pendingReviews");

    const approved =
        document.getElementById("approvedReports");

    if (!submitted || !pending || !approved)
        return;

    const reports = cachedUserReports || [];
    submitted.textContent = reports.length;
    pending.textContent = reports.filter(r => r.reviewStatus === "Pending").length;
    approved.textContent = reports.filter(r => r.reviewStatus === "Approved").length;
    const departmentCount = document.getElementById("departmentCount");
    if (departmentCount) departmentCount.textContent = reports.length ? new Set(reports.map(r => r.department).filter(Boolean)).size : "0";
}


// ======================================================
// SEARCH
// ======================================================

const searchInput =
    document.getElementById("searchInput");

if (searchInput) {

    searchInput.addEventListener("input", function () {

        applyReportSearch();
    });
}


// ======================================================
// SHOW CURRENT USER
// ======================================================

const userNameElements =
    document.querySelectorAll(".current-user-name");

userNameElements.forEach(element => {

    element.textContent =
        sessionStorage.getItem("userName") || "Department Head";
});


// ======================================================
// LOGOUT
// ======================================================

const logoutButton =
    document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", function () {

        sessionStorage.clear();

        window.location.href =
            "login.html";
    });
}


// ======================================================
// HTML SAFETY
// ======================================================

function escapeHtml(value) {

    if (!value)
        return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Edit and resubmit a rejected report
async function editRejectedReport(reportId) {

    try {
        const userId = sessionStorage.getItem("userId");

        const response = await fetch(`${API_URL}/Reports/user/${userId}`);
        const reports = await response.json();

        const report = reports.find(r => r.id === reportId);

        if (!report) {
            Swal.fire({
                title: "Report Not Found",
                text: "Could not find the selected report.",
                icon: "error"
            });
            return;
        }

        if (report.reviewStatus !== "Rejected") {
            Swal.fire({
                title: "Cannot Edit",
                text: "Only rejected reports can be resubmitted.",
                icon: "warning"
            });
            return;
        }

        // Open the report form before editing the rejected report.
        openReportForm();
        const formHeading = document.getElementById("reportFormHeading");
        if (formHeading) formHeading.textContent = "Edit Rejected Report";

        // Fill the existing report form
        document.getElementById("reportTitle").value = report.projectTitle;
        document.getElementById("team").value = report.department || "";
        document.getElementById("status").value = report.projectStatus;
        document.getElementById("importance").value = report.importance;

        document.getElementById("reportSummary").value = report.projectSummary || "";
        document.getElementById("reportChallenges").value = report.challenges || "";
        document.getElementById("reportProgress").value = report.nextSteps || "";
        document.getElementById("reportDate").value = report.dueDate ? String(report.dueDate).slice(0, 10) : "";

        // Change button into resubmit mode
        const submitButton = document.getElementById("submitBtn");

        submitButton.innerHTML = `
            <i class="fa-solid fa-paper-plane me-2"></i>
            Resubmit Report
        `;

        submitButton.classList.remove("btn-warning");
        submitButton.classList.add("btn-success");

        // Store the report ID so the submit handler knows this is an edit
        document.getElementById("reportForm").dataset.editingReportId = report.id;

        // Show rejection feedback
        Swal.fire({
            title: "Editing Rejected Report",
            html: `
                <p class="mb-2">
                    You can now update your report and resubmit it.
                </p>

                ${
                    report.adminFeedback
                    ? `<div class="alert alert-danger text-start">
                        <strong>Admin Feedback:</strong><br>
                        ${escapeHtml(report.adminFeedback)}
                       </div>`
                    : ""
                }
            `,
            icon: "info",
            confirmButtonText: "Edit Report",
            confirmButtonColor: "#fca311"
        });

        // Scroll back to form
        document.getElementById("reportForm").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error(error);

        Swal.fire({
            title: "Connection Error",
            text: "Could not load the rejected report.",
            icon: "error"
        });
    }
}

// ======================================================
// INITIAL LOAD
// ======================================================

loadReports();
updateStats();