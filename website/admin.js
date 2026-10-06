const API_URL = 'https://snapnearn-backend-kishan.onrender.com/api';

let adminToken = null;
let reports = [];


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin() {

    const email =
        document.getElementById('adminEmail').value.trim();

    const password =
        document.getElementById('adminPassword').value;

    const errorElement =
        document.getElementById('loginError');

    errorElement.style.display = 'none';

    if (!email || !password) {

        errorElement.textContent =
            'Please enter email and password.';

        errorElement.style.display = 'block';

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({
                    identifier: email,
                    password: password
                })
            }
        );

        const data =
            await response.json();

        console.log(
            'Admin login response:',
            data
        );

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                'Invalid admin credentials.'
            );
        }

        /* =========================================
           CHECK ADMIN ROLE
        ========================================= */

        if (
            !data.user ||
            data.user.role !== 'admin'
        ) {

            throw new Error(
                'This account is not an administrator.'
            );
        }

        /* =========================================
           STORE ADMIN SESSION
        ========================================= */

        adminToken =
            data.token;

        localStorage.setItem(
            'snapnearn_admin_token',
            adminToken
        );

        localStorage.setItem(
            'snapnearn_admin_user',
            JSON.stringify(
                data.user
            )
        );

        /* =========================================
           SHOW DASHBOARD
        ========================================= */

        document.getElementById(
            'loginPage'
        ).style.display = 'none';

        document.getElementById(
            'adminDashboard'
        ).style.display = 'block';

        document.getElementById(
            'adminEmailDisplay'
        ).textContent =
            data.user.email ||
            email;

        /* =========================================
           LOAD REPORTS
        ========================================= */

        await loadReports();

    } catch (error) {

        console.error(
            'Admin login error:',
            error
        );

        errorElement.textContent =
            error.message;

        errorElement.style.display =
            'block';
    }
}


/* =========================================================
   LOAD REPORTS
========================================================= */

async function loadReports() {

    const container =
        document.getElementById(
            'reportsContainer'
        );

    container.innerHTML = `
        <div class="loading">
            Loading reports...
        </div>
    `;

    try {

        if (!adminToken) {

            adminToken =
                localStorage.getItem(
                    'snapnearn_admin_token'
                );
        }

        if (!adminToken) {

            throw new Error(
                'Admin session expired. Please login again.'
            );
        }

        const response =
            await fetch(
                `${API_URL}/reports`,
                {
                    method: 'GET',

                    headers: {
                        'Authorization':
                            `Bearer ${adminToken}`
                    }
                }
            );

        const data =
            await response.json();

        console.log(
            'Reports response:',
            data
        );

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                'Failed to load reports.'
            );
        }

        reports =
            data.data || [];

        updateStatistics();

        displayReports();

    } catch (error) {

        console.error(
            'Load reports error:',
            error
        );

        container.innerHTML = `
            <div class="no-reports">

                <h3>
                    ❌ Unable to load reports
                </h3>

                <p style="margin-top:10px;">
                    ${escapeHtml(error.message)}
                </p>

            </div>
        `;
    }
}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        reports.length;

    const pending =
        reports.filter(
            report =>
                report.status === 'pending'
        ).length;

    const verified =
        reports.filter(
            report =>
                report.status === 'verified'
        ).length;

    const challans =
        reports.filter(
            report =>
                report.status === 'challan_issued'
        ).length;

    document.getElementById(
        'totalReports'
    ).textContent = total;

    document.getElementById(
        'pendingReports'
    ).textContent = pending;

    document.getElementById(
        'verifiedReports'
    ).textContent = verified;

    document.getElementById(
        'challanReports'
    ).textContent = challans;
}


/* =========================================================
   DISPLAY REPORTS
========================================================= */

function displayReports() {

    const container =
        document.getElementById(
            'reportsContainer'
        );

    if (!reports.length) {

        container.innerHTML = `
            <div class="no-reports">

                <h3>
                    No reports found
                </h3>

                <p style="margin-top:10px;">
                    Citizen reports will appear here.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        reports.map(
            report =>
                createReportCard(report)
        ).join('');
}


/* =========================================================
   CREATE REPORT CARD
========================================================= */

function createReportCard(report) {

    const photo =
        report.photos &&
        report.photos.length
            ? report.photos[0].url
            : '';

    const violation =
        formatViolation(
            report.violationType
        );

    const status =
        report.status ||
        'pending';

    const numberPlate =
        report.vehicleDetails?.numberPlate ||
        'Not detected';

    const address =
        report.location?.address ||
        'Location unavailable';

    const latitude =
        report.location?.coordinates?.[1];

    const longitude =
        report.location?.coordinates?.[0];

    const aiConfidence =
        report.aiAnalysis?.violationConfidence;

    const confidence =
        aiConfidence !== undefined
            ? `${(
                Number(aiConfidence) * 100
            ).toFixed(1)}%`
            : 'N/A';

    const createdAt =
        report.createdAt
            ? new Date(
                report.createdAt
            ).toLocaleString()
            : 'Unknown';

    const imageHtml =
        photo
            ? `
                <img
                    class="report-image"
                    src="${escapeAttribute(photo)}"
                    alt="Violation Evidence"
                >
            `
            : `
                <div
                    class="report-image"
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#777;
                    "
                >
                    No evidence image
                </div>
            `;

    return `
        <div class="report-card">

            ${imageHtml}

            <div class="report-content">

                <h3>
                    🚨 ${escapeHtml(violation)}
                </h3>

                <div class="detail">
                    <strong>Vehicle:</strong>
                    ${escapeHtml(numberPlate)}
                </div>

                <div class="detail">
                    <strong>Location:</strong>
                    ${escapeHtml(address)}
                </div>

                <div class="detail">
                    <strong>GPS:</strong>
                    ${
                        latitude !== undefined &&
                        longitude !== undefined
                            ? `${latitude.toFixed(6)},
                               ${longitude.toFixed(6)}`
                            : 'Unavailable'
                    }
                </div>

                <div class="detail">
                    <strong>AI Confidence:</strong>
                    ${confidence}
                </div>

                <div class="detail">
                    <strong>Reported:</strong>
                    ${escapeHtml(createdAt)}
                </div>

                <div class="detail">
                    <strong>Report ID:</strong>
                    ${escapeHtml(
                        report._id || 'N/A'
                    )}
                </div>

                <span
                    class="status ${escapeAttribute(status)}"
                >
                    ${formatStatus(status)}
                </span>

                ${
                    status === 'pending'
                        ? `
                            <div class="report-actions">

                                <button
                                    class="action-btn verify-btn"
                                    onclick="verifyReport('${escapeAttribute(report._id)}')"
                                >
                                    ✓ Verify
                                </button>

                                <button
                                    class="action-btn reject-btn"
                                    onclick="rejectReport('${escapeAttribute(report._id)}')"
                                >
                                    ✕ Reject
                                </button>

                            </div>
                        `
                        : ''
                }

            </div>

        </div>
    `;
}


/* =========================================================
   VERIFY REPORT
========================================================= */

async function verifyReport(reportId) {

    if (!confirm(
        'Are you sure you want to verify this report?'
    )) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/reports/${reportId}/verify`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'Authorization':
                            `Bearer ${adminToken}`
                    },

                    body: JSON.stringify({
                        verificationNotes:
                            'Verified by administrator.'
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            'Verify response:',
            data
        );

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Unable to verify report.'
            );
        }

        alert(
            'Report verified successfully.'
        );

        await loadReports();

    } catch (error) {

        console.error(
            'Verify error:',
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   REJECT REPORT
========================================================= */

async function rejectReport(reportId) {

    const reason =
        prompt(
            'Enter reason for rejecting this report:'
        );

    if (reason === null) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/reports/${reportId}/reject`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        'Authorization':
                            `Bearer ${adminToken}`
                    },

                    body: JSON.stringify({
                        verificationNotes:
                            reason ||
                            'Report rejected by administrator.'
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            'Reject response:',
            data
        );

        if (!response.ok) {

            throw new Error(
                data.message ||
                'Unable to reject report.'
            );
        }

        alert(
            'Report rejected.'
        );

        await loadReports();

    } catch (error) {

        console.error(
            'Reject error:',
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function adminLogout() {

    adminToken = null;

    localStorage.removeItem(
        'snapnearn_admin_token'
    );

    localStorage.removeItem(
        'snapnearn_admin_user'
    );

    document.getElementById(
        'adminDashboard'
    ).style.display = 'none';

    document.getElementById(
        'loginPage'
    ).style.display = 'flex';

    document.getElementById(
        'adminPassword'
    ).value = '';
}


/* =========================================================
   FORMAT VIOLATION
========================================================= */

function formatViolation(type) {

    const names = {

        no_helmet:
            'No Helmet',

        wrong_side:
            'Wrong Side Driving',

        signal_jump:
            'Signal Jump',

        overspeeding:
            'Overspeeding',

        drunk_driving:
            'Drunk Driving',

        other:
            'Other Violation'
    };

    return names[type] ||
        type ||
        'Unknown Violation';
}


/* =========================================================
   FORMAT STATUS
========================================================= */

function formatStatus(status) {

    const names = {

        pending:
            'Pending Review',

        under_review:
            'Under Review',

        verified:
            'Verified',

        rejected:
            'Rejected',

        challan_issued:
            'Challan Issued'
    };

    return names[status] ||
        status;
}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function escapeAttribute(value) {
    return escapeHtml(value);
}


/* =========================================================
   AUTO LOGIN FROM SAVED ADMIN SESSION
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        const savedToken =
            localStorage.getItem(
                'snapnearn_admin_token'
            );

        const savedUser =
            localStorage.getItem(
                'snapnearn_admin_user'
            );

        if (
            savedToken &&
            savedUser
        ) {

            try {

                const user =
                    JSON.parse(
                        savedUser
                    );

                if (
                    user.role === 'admin'
                ) {

                    adminToken =
                        savedToken;

                    document.getElementById(
                        'loginPage'
                    ).style.display = 'none';

                    document.getElementById(
                        'adminDashboard'
                    ).style.display = 'block';

                    document.getElementById(
                        'adminEmailDisplay'
                    ).textContent =
                        user.email ||
                        'Administrator';

                    await loadReports();
                }

            } catch (error) {

                console.error(
                    'Saved admin session error:',
                    error
                );

                adminLogout();
            }
        }
    }
);



