/* ================================================================
   Fee Reminder Generator – App JavaScript
   EduGenz | Professional School Management Tools
   v3.0 – Single + Generalized Bulk mode
   ================================================================ */

'use strict';

// ----------------------------------------------------------------
// Global State
// ----------------------------------------------------------------
const state = {
    /** Active "preview" messages shown in the tabs */
    messages: { whatsapp: '', sms: '', email: '', subject: '' },
    isBulkMode: false
};


// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadSavedSchoolName();
    setDefaultDueDate();
    bindEventListeners();
});

// ----------------------------------------------------------------
// Helpers – Date / Labels
// ----------------------------------------------------------------
function setDefaultDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    document.getElementById('dueDate').value = d.toISOString().split('T')[0];
}

function formatDisplayDate(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getTemplateLabel(template) {
    return { monthly: 'Monthly Fee', transport: 'Transport Fee', exam: 'Examination Fee', overdue: 'Overdue Fee' }[template] || 'Fee';
}

// ----------------------------------------------------------------
// Tone Configuration
// ----------------------------------------------------------------
function getToneConfig(tone) {
    const map = {
        gentle: {
            greeting:       'Hope this message finds you well.',
            urgency:        'We kindly request you to clear the pending fee at your earliest convenience.',
            closing:        'We appreciate your cooperation and look forward to your prompt response.',
            subject_prefix: '[Gentle Reminder]'
        },
        formal: {
            greeting:       'This is a formal notification regarding the pending fee.',
            urgency:        'You are requested to submit the outstanding fee as per school policy.',
            closing:        'Please ensure timely payment to avoid any inconvenience. Thank you for your cooperation.',
            subject_prefix: '[Fee Notice]'
        },
        final: {
            greeting:       '⚠️ IMPORTANT: This is a final reminder regarding your outstanding fee.',
            urgency:        '🚨 Kindly settle the dues IMMEDIATELY to avoid late charges or other measures as per school policy.',
            closing:        'Failure to respond may result in further disciplinary action. Immediate attention is required.',
            subject_prefix: '[FINAL NOTICE]'
        }
    };
    return map[tone] || map.gentle;
}

// ----------------------------------------------------------------
// localStorage helpers
// ----------------------------------------------------------------
function loadSavedSchoolName() {
    const saved = localStorage.getItem('frg_schoolName');
    if (saved) document.getElementById('schoolName').value = saved;
}

// ================================================================
// EVENT BINDING
// ================================================================
function bindEventListeners() {
    // Reminder mode (single / bulk)
    document.querySelectorAll('input[name="reminderMode"]').forEach(r =>
        r.addEventListener('change', onModeChange));

    // Auto-save school name
    document.getElementById('schoolName').addEventListener('input', e =>
        localStorage.setItem('frg_schoolName', e.target.value.trim()));

    // Bulk textarea live counters
    document.getElementById('bulkPhones').addEventListener('input', updateBulkCounters);
    document.getElementById('bulkEmails').addEventListener('input', updateBulkCounters);

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Remove is-invalid on any input
    document.querySelectorAll('.form-control, .form-select').forEach(el =>
        el.addEventListener('input', () => el.classList.remove('is-invalid')));
}

// ================================================================
// MODE CHANGE HANDLERS
// ================================================================

/** Reminder mode toggle: Single ↔ Bulk */
function onModeChange() {
    const mode = document.querySelector('input[name="reminderMode"]:checked').value;
    state.isBulkMode = (mode === 'bulk');

    document.getElementById('singleModeFields').classList.toggle('d-none',  state.isBulkMode);
    document.getElementById('bulkModeFields').classList.toggle('d-none',   !state.isBulkMode);

    // Show personal detail fields (parent/student/class) only in Single mode
    const personalFields = document.getElementById('personalDetailFields');
    if (personalFields) personalFields.classList.toggle('d-none', state.isBulkMode);

    hideOutputSection();
}

// ----------------------------------------------------------------
// Bulk counter text (generalized mode)
// ----------------------------------------------------------------
function updateBulkCounters() {
    const phones = parseBulkList('bulkPhones');
    const emails = parseBulkList('bulkEmails');
    document.getElementById('phoneCountText').textContent =
        `${phones.length} phone number${phones.length !== 1 ? 's' : ''} entered`;
    document.getElementById('emailCountText').textContent =
        `${emails.length} email address${emails.length !== 1 ? 'es' : ''} entered`;
}

/** Parse comma / newline-separated textarea into a clean array */
function parseBulkList(elementId) {
    return document.getElementById(elementId).value
        .split(/[\n,]+/)
        .map(v => v.trim())
        .filter(v => v.length > 0);
}

// ================================================================
// VALIDATORS
// ================================================================
function isValidPhone(phone) {
    return /^\d{10,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ================================================================
// FORM VALIDATION (mode-aware)
// ================================================================
function validateForm() {
    let valid = true;

    const markInvalid = id => { const el = document.getElementById(id); if (el) el.classList.add('is-invalid'); valid = false; };
    const markValid   = id => { const el = document.getElementById(id); if (el) el.classList.remove('is-invalid'); };
    const field       = id => document.getElementById(id)?.value.trim() || '';

    // School name and due date are always required
    field('schoolName') ? markValid('schoolName') : markInvalid('schoolName');
    field('dueDate')    ? markValid('dueDate')    : markInvalid('dueDate');

    if (!state.isBulkMode) {
        // -- Single Mode ------------------------------------------
        ['parentName', 'studentName', 'studentClass'].forEach(id =>
            field(id) ? markValid(id) : markInvalid(id));

        const amt = field('dueAmount');
        (amt && Number(amt) > 0) ? markValid('dueAmount') : markInvalid('dueAmount');

        const phone = field('parentPhone');
        const email = field('parentEmail');
        (phone && !isValidPhone(phone)) ? markInvalid('parentPhone') : markValid('parentPhone');
        (email && !isValidEmail(email)) ? markInvalid('parentEmail') : markValid('parentEmail');

    } else {
        // -- Bulk Generalized -------------------------------------
        const amt = field('dueAmount');
        if (!amt || Number(amt) <= 0) { markInvalid('dueAmount'); }
        else markValid('dueAmount');

        if (parseBulkList('bulkPhones').length === 0 && parseBulkList('bulkEmails').length === 0) {
            showToast('⚠️ Please enter at least one phone number or email address.', 'warning');
            valid = false;
        }
    }

    return valid;
}

// ================================================================
// FORM DATA COLLECTION
// ================================================================
function getFormData() {
    return {
        schoolName:   document.getElementById('schoolName').value.trim(),
        parentName:   document.getElementById('parentName').value.trim(),
        studentName:  document.getElementById('studentName').value.trim(),
        studentClass: document.getElementById('studentClass').value.trim(),
        dueAmount:    document.getElementById('dueAmount').value.trim(),
        dueDate:      formatDisplayDate(document.getElementById('dueDate').value),
        phone:        document.getElementById('parentPhone').value.trim(),
        email:        document.getElementById('parentEmail').value.trim(),
        tone:         document.getElementById('messageTone').value,
        template:     document.getElementById('feeTemplate').value
    };
}

// ================================================================
// MESSAGE BUILDERS — Single (student-specific)
// ================================================================

/** WhatsApp: personalized, includes student & parent name */
function buildWhatsAppMessage(data) {
    const tc  = getToneConfig(data.tone);
    const fee = getTemplateLabel(data.template);
    const amt = Number(data.dueAmount || 0).toLocaleString('en-IN');

    if (data.tone === 'final') {
        return `🔔 *${data.schoolName}*\n${'-'.repeat(32)}\n\n⚠️ *FINAL FEE REMINDER*\n\nDear Parent / Guardian of *${data.studentName}*,\n\n${tc.greeting}\n\n📌 *Student:* ${data.studentName}\n📚 *Class:* ${data.studentClass}\n💳 *Fee Type:* ${fee}\n💰 *Pending Amount:* ₹${amt}\n📅 *Due Date:* ${data.dueDate}\n\n${tc.urgency}\n\n${tc.closing}\n\nFor enquiries, contact the school office immediately.\n\n_– ${data.schoolName} Administration_`;
    }

    return `🏫 *${data.schoolName}*\n${'-'.repeat(32)}\n\nDear *${data.parentName}*,\n\n${tc.greeting}\n\nThis is a reminder that the *${fee}* for your ward is pending.\n\n👤 *Student:* ${data.studentName}\n📚 *Class:* ${data.studentClass}\n💳 *Fee Type:* ${fee}\n💰 *Due Amount:* ₹${amt}\n📅 *Due Date:* ${data.dueDate}\n\n${tc.urgency}\n\n${tc.closing}\n\nThank you,\n_${data.schoolName} Administration_`;
}

/** SMS: personalized, compact */
function buildSMSMessage(data) {
    const fee  = getTemplateLabel(data.template);
    const verb = { gentle: 'Kindly clear', formal: 'Please clear', final: 'URGENT: Clear' }[data.tone] || 'Kindly clear';
    return `${data.schoolName}: Dear Parent of ${data.studentName} (${data.studentClass}), ${verb} ${fee} Rs.${data.dueAmount} by ${data.dueDate}. Contact school for details.`;
}

/** Email: personalized, includes student details */
function buildEmailMessage(data) {
    const tc  = getToneConfig(data.tone);
    const fee = getTemplateLabel(data.template);
    const amt = Number(data.dueAmount || 0).toLocaleString('en-IN');

    const subject = `${tc.subject_prefix} ${fee} Reminder – ${data.studentName} (${data.studentClass}) | ${data.schoolName}`;
    const body    =
`Dear ${data.parentName},

${tc.greeting}

We are writing to inform you that the ${fee} for your child is currently pending.

----- STUDENT DETAILS -----
  Student Name  : ${data.studentName}
  Class / Grade : ${data.studentClass}
  Fee Type      : ${fee}
  Due Amount    : ₹${amt}
  Due Date      : ${data.dueDate}
---------------------------

${tc.urgency}

${tc.closing}

Should you have any queries, please contact our school office during working hours.

Warm Regards,
${data.schoolName}
School Administration Office

---------------------------------------------------------
This is an automated fee reminder. Please do not reply directly to this message.
---------------------------------------------------------`;

    return { subject, body };
}

// ================================================================
// MESSAGE BUILDERS — Generalized Bulk (no personal details)
// ================================================================

/** WhatsApp: generalized – no parent/student/class */
function buildGeneralizedWhatsAppMessage(data) {
    const tc  = getToneConfig(data.tone);
    const fee = getTemplateLabel(data.template);

    if (data.tone === 'final') {
        return `🔔 *${data.schoolName}*\n${'-'.repeat(32)}\n\n⚠️ *FINAL FEE REMINDER*\n\nDear Parents / Guardians,\n\n${tc.greeting}\n\n💳 *Fee Type:* ${fee}\n📅 *Due Date:* ${data.dueDate}\n\n${tc.urgency}\n\nKindly ignore this message if payment has already been completed.\n\nFor enquiries, contact the school office immediately.\n\n_– ${data.schoolName} Administration_`;
    }

    return `🏫 *${data.schoolName}*\n${'-'.repeat(32)}\n\nDear Parents,\n\n${tc.greeting}\n\nThis is a reminder that *${fee}* payments are currently due.\n\n💳 *Fee Type:* ${fee}\n📅 *Due Date:* ${data.dueDate}\n\n${tc.urgency}\n\nKindly ignore this message if payment has already been completed.\n\n_${data.schoolName} Administration_`;
}

/** SMS: generalized – compact, no personal details */
function buildGeneralizedSMSMessage(data) {
    const verb = { gentle: 'Kindly clear', formal: 'Please clear', final: 'URGENT: Clear' }[data.tone] || 'Kindly clear';
    return `${data.schoolName}: Dear Parents, ${verb} pending school fees before ${data.dueDate}. Kindly ignore if already paid. -School Admin`;
}

/** Email: generalized – professional, no personal details */
function buildGeneralizedEmailMessage(data) {
    const tc  = getToneConfig(data.tone);
    const fee = getTemplateLabel(data.template);

    const subject = `School Fee Reminder Notice | ${data.schoolName}`;
    const body    =
`Dear Parents,

${tc.greeting}

This is a reminder that ${fee} payments are currently due.

----- FEE DETAILS -----
  Fee Type  : ${fee}
  Due Date  : ${data.dueDate}
-----------------------

${tc.urgency}

Kindly ignore this message if payment has already been completed.

For any queries, please contact the school administration during working hours.

Warm Regards,
${data.schoolName}
School Administration Office

---------------------------------------------------------
This is an automated fee reminder. Please do not reply directly to this message.
---------------------------------------------------------`;

    return { subject, body };
}

// ================================================================
// GENERATE — Main Entry Point
// ================================================================
function generateReminder() {
    if (!validateForm()) {
        if (!state.isBulkMode) {
            showToast('⚠️ Please fill in all required fields correctly.', 'warning');
        }
        return;
    }

    const btn = document.getElementById('generateBtn');
    btn.querySelector('.btn-text').classList.add('d-none');
    btn.querySelector('.btn-spinner').classList.remove('d-none');
    btn.disabled = true;

    setTimeout(() => {
        const data = getFormData();

        if (!state.isBulkMode) {
            // -- Single Mode ------------------------------------------
            state.messages.whatsapp = buildWhatsAppMessage(data);
            state.messages.sms      = buildSMSMessage(data);
            const { subject, body } = buildEmailMessage(data);
            state.messages.subject  = subject;
            state.messages.email    = body;

        } else {
            // -- Bulk Generalized: one common message, no personal details
            state.messages.whatsapp         = buildGeneralizedWhatsAppMessage(data);
            state.messages.sms              = buildGeneralizedSMSMessage(data);
            const { subject: gs, body: gb } = buildGeneralizedEmailMessage(data);
            state.messages.subject          = gs;
            state.messages.email            = gb;
        }

        renderOutputSection(data);

        btn.querySelector('.btn-text').classList.remove('d-none');
        btn.querySelector('.btn-spinner').classList.add('d-none');
        btn.disabled = false;

        showToast('✅ Reminder generated successfully!', 'success');
    }, 480);
}

// ================================================================
// RENDER OUTPUT
// ================================================================
function renderOutputSection(data) {
    document.getElementById('whatsappMessage').textContent = state.messages.whatsapp;
    document.getElementById('smsMessage').textContent      = state.messages.sms;
    document.getElementById('emailMessage').textContent    = state.messages.email;
    document.getElementById('emailSubject').textContent    = state.messages.subject;

    const smsLen = state.messages.sms.length;
    document.getElementById('smsCharCount').textContent = smsLen;
    document.getElementById('smsParts').textContent     = Math.ceil(smsLen / 160);

    if (state.isBulkMode) {
        const phones = parseBulkList('bulkPhones');
        const emails = parseBulkList('bulkEmails');
        const total  = Math.max(phones.length, emails.length);

        document.getElementById('totalContacts').textContent = total;
        document.getElementById('totalPhones').textContent   = phones.length;
        document.getElementById('totalEmails').textContent   = emails.length;
        document.getElementById('bulkStatsBar').classList.remove('d-none');

        setElementDisplay('sendWhatsAppBtn',  'none');
        setElementDisplay('bulkWhatsAppBtn',  phones.length > 0 ? 'inline-flex' : 'none');
        setElementDisplay('sendEmailBtn',     'none');
        setElementDisplay('sendBulkEmailBtn', emails.length > 0 ? 'inline-flex' : 'none');

    } else {
        document.getElementById('bulkStatsBar').classList.add('d-none');

        setElementDisplay('sendWhatsAppBtn',  data.phone ? 'inline-flex' : 'none');
        setElementDisplay('bulkWhatsAppBtn',  'none');
        setElementDisplay('sendEmailBtn',     data.email ? 'inline-flex' : 'none');
        setElementDisplay('sendBulkEmailBtn', 'none');
    }

    document.getElementById('bulkWhatsAppLinks').classList.add('d-none');
    document.getElementById('whatsappLinksContainer').innerHTML = '';

    document.getElementById('emptyState').classList.add('d-none');
    const out = document.getElementById('outputSection');
    out.classList.remove('d-none');
    out.classList.add('animate-in');

    if (window.innerWidth < 992) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ================================================================
// HIDE OUTPUT
// ================================================================
function hideOutputSection() {
    document.getElementById('outputSection').classList.add('d-none');
    document.getElementById('outputSection').classList.remove('animate-in');
    document.getElementById('emptyState').classList.remove('d-none');
    document.getElementById('bulkWhatsAppLinks').classList.add('d-none');
}

// ================================================================
// COPY / CLIPBOARD
// ================================================================
function copyMessage(type) {
    let text = '';
    if      (type === 'whatsapp') text = state.messages.whatsapp;
    else if (type === 'sms')      text = state.messages.sms;
    else if (type === 'email')    text = `Subject: ${state.messages.subject}\n\n${state.messages.email}`;

    if (!text) { showToast('⚠️ Generate a reminder first.', 'warning'); return; }
    writeToClipboard(text);
    showToast('📋 Message copied to clipboard!', 'success');
}

function copyAllMessages() {
    const all =
        `=== WHATSAPP ===\n${state.messages.whatsapp}\n\n` +
        `=== SMS ===\n${state.messages.sms}\n\n` +
        `=== EMAIL SUBJECT ===\n${state.messages.subject}\n\n` +
        `=== EMAIL BODY ===\n${state.messages.email}`;
    writeToClipboard(all);
    showToast('📋 All messages copied!', 'success');
}

function writeToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
    } else {
        execCommandCopy(text);
    }
}

function execCommandCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (_) { /* silent */ }
    document.body.removeChild(ta);
}

// ================================================================
// SEND ACTIONS
// ================================================================

/** Single WhatsApp send */
function sendWhatsApp() {
    const raw = document.getElementById('parentPhone').value.trim();
    if (!raw) { showToast('⚠️ Please enter a phone number first.', 'warning'); return; }
    const cleaned = raw.replace(/\D/g, '');
    const number  = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(state.messages.whatsapp)}`, '_blank', 'noopener,noreferrer');
}

/** Generate bulk WhatsApp links (generalized: all contacts share the same message). */
function generateBulkWhatsAppLinks() {
    const container     = document.getElementById('whatsappLinksContainer');
    container.innerHTML = '';
    const phones        = parseBulkList('bulkPhones');
    if (phones.length === 0) { showToast('⚠️ No phone numbers to process.', 'warning'); return; }

    const encoded = encodeURIComponent(state.messages.whatsapp);
    let valid     = 0;

    phones.forEach((phone, i) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 10) { container.appendChild(createInvalidLinkItem(i + 1, phone)); return; }
        valid++;
        const number = cleaned.length === 10 ? `91${cleaned}` : cleaned;
        container.appendChild(createValidLinkItem(i + 1, phone, `https://wa.me/${number}?text=${encoded}`));
    });

    document.getElementById('bulkWhatsAppLinks').classList.remove('d-none');
    showToast(`✅ Generated ${valid} WhatsApp link${valid !== 1 ? 's' : ''}!`, 'success');
}

function createValidLinkItem(num, label, url) {
    const item = document.createElement('div');
    item.className = 'bulk-link-item';
    item.innerHTML = `
        <span class="phone-label"><i class="bi bi-person-circle me-1"></i>${escapeHtml(String(label))}</span>
        <a href="${url}" target="_blank" rel="noopener noreferrer"><i class="bi bi-whatsapp"></i> Open Chat</a>`;
    return item;
}

function createInvalidLinkItem(num, phone) {
    const item = document.createElement('div');
    item.className = 'bulk-link-item';
    item.innerHTML = `<span class="phone-label text-danger"><i class="bi bi-exclamation-circle"></i> Contact ${num}: ${escapeHtml(String(phone))} (invalid)</span>`;
    return item;
}

/** Single Email send */
function sendEmail() {
    const email = document.getElementById('parentEmail').value.trim();
    if (!email) { showToast('⚠️ Please enter an email address first.', 'warning'); return; }
    if (!isValidEmail(email)) { showToast('⚠️ Please enter a valid email address.', 'warning'); return; }
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(state.messages.subject)}&body=${encodeURIComponent(state.messages.email)}`;
}

/**
 * Bulk Email send (generalized mode only).
 * Opens a single BCC email in the default client with all valid addresses.
 */
function sendBulkEmail() {
    const rawEmails   = parseBulkList('bulkEmails');
    const validEmails = rawEmails.filter(isValidEmail);
    const invalid     = rawEmails.length - validEmails.length;
    if (validEmails.length === 0) { showToast('⚠️ No valid email addresses found.', 'warning'); return; }

    window.location.href = `mailto:?bcc=${encodeURIComponent(validEmails.join(','))}&subject=${encodeURIComponent(state.messages.subject)}&body=${encodeURIComponent(state.messages.email)}`;
    showToast(
        invalid > 0
            ? `📧 Opening email for ${validEmails.length} recipients (${invalid} invalid skipped)…`
            : `📧 Opening email for ${validEmails.length} recipient${validEmails.length !== 1 ? 's' : ''}…`,
        'success'
    );
}

// ================================================================
// EXPORT — CSV
// ================================================================
function downloadCSV() {
    const data   = getFormData();
    const header = ['School Name', 'Parent Name', 'Student Name', 'Class', 'Fee Type',
                    'Due Amount (INR)', 'Due Date', 'Phone', 'Email',
                    'WhatsApp Message', 'SMS Message'];
    const csvRows = [header.join(',')];

    const phones = state.isBulkMode ? parseBulkList('bulkPhones') : [data.phone];
    const emails = state.isBulkMode ? parseBulkList('bulkEmails') : [data.email];
    const rows   = Math.max(phones.length, emails.length, 1);

    for (let i = 0; i < rows; i++) csvRows.push([
        csvEscape(data.schoolName),
        csvEscape(data.parentName),
        csvEscape(data.studentName),
        csvEscape(data.studentClass),
        csvEscape(getTemplateLabel(data.template)),
        csvEscape(data.dueAmount),
        csvEscape(data.dueDate),
        csvEscape(phones[i] || ''),
        csvEscape(emails[i] || ''),
        csvEscape(state.messages.whatsapp),
        csvEscape(state.messages.sms)
    ].join(','));

    downloadBlob(csvRows.join('\n'),
        `fee-reminder-${(data.schoolName || 'school').replace(/\s+/g, '-')}-${Date.now()}.csv`,
        'text/csv;charset=utf-8;');
    showToast('📥 CSV downloaded!', 'success');
}

function csvEscape(val) { return `"${String(val ?? '').replace(/"/g, '""')}"`; }

// ================================================================
// EXPORT — TXT
// ================================================================
function downloadTxt() {
    const data    = getFormData();
    const sep     = '='.repeat(60);
    const content =
        `${sep}\n  FEE REMINDER — ${data.schoolName.toUpperCase()}\n  Generated: ${new Date().toLocaleString('en-IN')}\n${sep}\n\n` +
        `WHATSAPP MESSAGE\n${sep}\n${state.messages.whatsapp}\n\n${sep}\n` +
        `SMS MESSAGE\n${sep}\n${state.messages.sms}\n\n${sep}\n` +
        `EMAIL SUBJECT\n${sep}\n${state.messages.subject}\n\n${sep}\n` +
        `EMAIL BODY\n${sep}\n${state.messages.email}\n\n${sep}\n` +
        `Generated by Fee Reminder Generator | EduGenz\n${sep}`;

    downloadBlob(content, `fee-reminder-${Date.now()}.txt`, 'text/plain;charset=utf-8;');
    showToast('📥 Text file downloaded!', 'success');
}

// ================================================================
// EXPORT — PDF (html2pdf.js)
// ================================================================
function exportPDF() {
    if (typeof html2pdf === 'undefined') {
        showToast('⚠️ PDF library not loaded. Check your internet connection.', 'warning');
        return;
    }

    const data    = getFormData();
    const amt     = Number(data.dueAmount).toLocaleString('en-IN');
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'font-family:Arial,sans-serif;padding:28px;color:#1e293b;max-width:680px;';

    wrapper.innerHTML = `
        <div style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:white;padding:24px;border-radius:12px;text-align:center;margin-bottom:22px;">
            <div style="font-size:26px;margin-bottom:6px;">&#127983;</div>
            <h2 style="margin:0;font-size:20px;font-weight:800;">${escapeHtml(data.schoolName)}</h2>
            <p style="margin:5px 0 0;opacity:.88;font-size:13px;">Fee Reminder Notice</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
            ${pdfRow('Fee Type', getTemplateLabel(data.template), true)}
            ${pdfAmountRow(amt)}
            ${pdfRow('Due Date', data.dueDate)}
        </table>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-weight:700;font-size:12px;text-transform:uppercase;color:#4f46e5;">&#128241; WhatsApp Message</p>
            <p style="margin:0;font-size:12.5px;line-height:1.7;white-space:pre-line;">${escapeHtml(state.messages.whatsapp)}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-weight:700;font-size:12px;text-transform:uppercase;color:#0ea5e9;">&#128172; SMS Message</p>
            <p style="margin:0;font-size:12.5px;">${escapeHtml(state.messages.sms)}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-weight:700;font-size:12px;text-transform:uppercase;color:#ef4444;">&#128231; Email</p>
            <p style="margin:0 0 6px;font-weight:600;font-size:12.5px;">Subject: ${escapeHtml(state.messages.subject)}</p>
            <p style="margin:0;font-size:12px;line-height:1.65;white-space:pre-line;">${escapeHtml(state.messages.email)}</p>
        </div>
        <div style="text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:18px;">Generated by Fee Reminder Generator | EduGenz | ${new Date().toLocaleString('en-IN')}</div>`;

    html2pdf().set({
        margin:      10,
        filename:    `fee-reminder-${Date.now()}.pdf`,
        image:       { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(wrapper).save();

    showToast('📄 PDF export started!', 'success');
}

function pdfRow(label, value, shaded) {
    return `<tr style="${shaded ? 'background:#f1f5f9;' : ''}">
        <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:600;width:38%;">${label}</td>
        <td style="padding:9px 10px;border:1px solid #e2e8f0;">${escapeHtml(value)}</td>
    </tr>`;
}

function pdfAmountRow(amt) {
    return `<tr style="background:#fef3c7;">
        <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:600;">Due Amount</td>
        <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:800;color:#dc2626;font-size:15px;">&#8377;${amt}</td>
    </tr>`;
}

// ================================================================
// DOWNLOAD BLOB
// ================================================================
function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ================================================================
// RESET FORM
// ================================================================
function resetForm() {
    ['parentName', 'studentName', 'studentClass', 'dueAmount',
     'parentPhone', 'parentEmail', 'bulkPhones', 'bulkEmails'].forEach(id => {
        document.getElementById(id).value = '';
    });

    document.getElementById('messageTone').value = 'gentle';
    document.getElementById('feeTemplate').value  = 'monthly';

    // Reset to Single mode
    document.getElementById('modeSingle').checked = true;
    state.isBulkMode = false;
    document.getElementById('singleModeFields').classList.remove('d-none');
    document.getElementById('bulkModeFields').classList.add('d-none');

    const personalFields = document.getElementById('personalDetailFields');
    if (personalFields) personalFields.classList.remove('d-none');

    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    state.messages = { whatsapp: '', sms: '', email: '', subject: '' };

    setDefaultDueDate();
    updateBulkCounters();
    hideOutputSection();
    loadSavedSchoolName();
    showToast('🔄 Form reset successfully!', 'info');
}

// ================================================================
// THEME
// ================================================================
function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('frg_theme', next);
    document.getElementById('themeIcon').className = next === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
}

function loadSavedTheme() {
    const saved = localStorage.getItem('frg_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = saved === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
    }
}

// ================================================================
// TOAST
// ================================================================
function showToast(message, type = 'info') {
    const colours  = { success: '#10b981', warning: '#f59e0b', info: '#0ea5e9', error: '#ef4444' };
    const toastEl  = document.getElementById('mainToast');
    const toastMsg = document.getElementById('toastMessage');
    toastEl.style.background = colours[type] || colours.info;
    toastMsg.textContent     = message;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2800 }).show();
}

// ================================================================
// UTILITY
// ================================================================
function setElementDisplay(id, display) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
}

/** Escape HTML special chars – used when inserting user data into innerHTML */
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Alias for use in template literals (attribute values) */
const escHtml = escapeHtml;
