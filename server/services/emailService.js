const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send alert email to instructor when student is flagged
 */
const sendFlagAlert = async ({ instructorEmail, instructorName, studentName, studentEmail, examTitle, anomalyScore, riskLevel, sessionId, eventSummary }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠ Email not configured — skipping alert');
    return;
  }

  const riskEmoji = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' }[riskLevel] || '⚠';

  const eventRows = Object.entries(eventSummary)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #1e2535;color:#a0aec0;font-family:monospace">${k.replace(/_/g, ' ')}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1e2535;color:#ff4757;font-weight:bold;font-family:monospace">${v}</td>
      </tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0c10;font-family:'Segoe UI',sans-serif;color:#e8eaf0">
  <div style="max-width:560px;margin:40px auto;background:#0f1219;border:1px solid #1e2535;border-radius:12px;overflow:hidden">
    
    <!-- Header -->
    <div style="background:${riskLevel === 'critical' ? '#ff4757' : riskLevel === 'high' ? '#ff9f43' : '#ffd166'};padding:24px 32px">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(0,0,0,0.6)">
        ExamGuard Alert
      </div>
      <div style="font-size:22px;font-weight:800;color:#000;margin-top:4px">
        ${riskEmoji} Student Flagged for Review
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="color:#a0aec0;margin:0 0 24px">
        Hi ${instructorName}, a student in your exam has been automatically flagged due to suspicious behavioral patterns.
      </p>

      <!-- Info grid -->
      <div style="display:grid;gap:12px;margin-bottom:24px">
        <div style="background:#161b27;border-radius:8px;padding:16px">
          <div style="font-size:11px;color:#6b7591;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;margin-bottom:4px">Student</div>
          <div style="font-weight:700;font-size:16px">${studentName}</div>
          <div style="color:#6b7591;font-size:13px">${studentEmail}</div>
        </div>
        <div style="background:#161b27;border-radius:8px;padding:16px">
          <div style="font-size:11px;color:#6b7591;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;margin-bottom:4px">Exam</div>
          <div style="font-weight:700;font-size:16px">${examTitle}</div>
        </div>
        <div style="background:#161b27;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;color:#6b7591;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;margin-bottom:4px">Anomaly Score</div>
            <div style="font-weight:800;font-size:28px;color:${riskLevel === 'critical' ? '#ff4757' : riskLevel === 'high' ? '#ff9f43' : '#ffd166'};font-family:monospace">${anomalyScore}%</div>
          </div>
          <div style="background:${riskLevel === 'critical' ? 'rgba(255,71,87,0.15)' : 'rgba(255,159,67,0.15)'};border-radius:100px;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${riskLevel === 'critical' ? '#ff4757' : '#ff9f43'};font-family:monospace">
            ${riskLevel} risk
          </div>
        </div>
      </div>

      <!-- Event table -->
      <div style="margin-bottom:24px">
        <div style="font-size:11px;color:#6b7591;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;margin-bottom:8px">Detected Events</div>
        <table style="width:100%;border-collapse:collapse;background:#161b27;border-radius:8px;overflow:hidden">
          ${eventRows || '<tr><td style="padding:12px;color:#6b7591">No events recorded</td></tr>'}
        </table>
      </div>

      <!-- CTA -->
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/sessions/${sessionId}"
        style="display:block;text-align:center;background:#00d4ff;color:#000;font-weight:700;padding:14px;border-radius:8px;text-decoration:none;font-size:15px">
        Review Full Session →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #1e2535;font-size:12px;color:#3d4565;text-align:center">
      ExamGuard · Behavioral Integrity System · This alert was auto-generated
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"ExamGuard" <${process.env.EMAIL_USER}>`,
    to: instructorEmail,
    subject: `🚨 [ExamGuard] ${studentName} flagged in "${examTitle}" — ${anomalyScore}% anomaly score`,
    html,
  });

  console.log(`📧 Alert sent to ${instructorEmail} for student ${studentName}`);
};

module.exports = { sendFlagAlert };
