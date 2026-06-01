/**
 * generateSessionPDF
 * Generates a styled PDF report for an exam session using jsPDF.
 * Called from SessionReview page.
 */

export const generateSessionPDF = async (session) => {
  // Dynamically import jsPDF to keep bundle small
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; // A4 width
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  const riskColors = {
    low:      [0, 229, 160],
    medium:   [255, 209, 102],
    high:     [255, 159, 67],
    critical: [255, 71, 87],
  };
  const rc = riskColors[session.riskLevel] || [200, 200, 200];

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(10, 12, 16);
  doc.rect(0, 0, W, 40, 'F');

  doc.setFillColor(...rc);
  doc.rect(0, 0, 4, 40, 'F');

  doc.setTextColor(232, 234, 240);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ExamGuard', margin, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 117, 145);
  doc.text('BEHAVIORAL INTEGRITY REPORT', margin, 23);

  doc.setTextColor(232, 234, 240);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - margin, 16, { align: 'right' });
  doc.text(`Session ID: ${session._id}`, W - margin, 23, { align: 'right' });

  y = 52;

  // ── Anomaly score badge ──────────────────────────────────────
  doc.setFillColor(...rc);
  doc.roundedRect(W - margin - 28, 44, 28, 14, 3, 3, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${session.anomalyScore}%`, W - margin - 14, 53.5, { align: 'center' });

  doc.setTextColor(107, 117, 145);
  doc.setFontSize(7);
  doc.text('ANOMALY SCORE', W - margin - 14, 60, { align: 'center' });

  // ── Student & Exam info ─────────────────────────────────────
  const infoBox = (label, value, x, bY, w) => {
    doc.setFillColor(22, 27, 39);
    doc.roundedRect(x, bY, w, 18, 2, 2, 'F');
    doc.setTextColor(107, 117, 145);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x + 4, bY + 6);
    doc.setTextColor(232, 234, 240);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value).substring(0, 30), x + 4, bY + 13);
  };

  const half = (contentW - 4) / 2;
  infoBox('Student', session.student?.name || 'Unknown', margin, y, half);
  infoBox('Email', session.student?.email || '—', margin + half + 4, y, half);
  y += 22;
  infoBox('Exam', session.exam?.title || 'Unknown', margin, y, half);
  infoBox('Risk Level', session.riskLevel?.toUpperCase(), margin + half + 4, y, half);
  y += 22;

  const startDate = session.startedAt ? new Date(session.startedAt).toLocaleString() : '—';
  const endDate = session.submittedAt ? new Date(session.submittedAt).toLocaleString() : 'Not submitted';
  infoBox('Started', startDate, margin, y, half);
  infoBox('Submitted', endDate, margin + half + 4, y, half);
  y += 26;

  // ── Flagged banner ──────────────────────────────────────────
  if (session.flagged) {
    doc.setFillColor(255, 71, 87, 0.15);
    doc.setFillColor(60, 10, 15);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setDrawColor(255, 71, 87);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'S');
    doc.setTextColor(255, 71, 87);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('🚩  THIS SESSION HAS BEEN FLAGGED FOR REVIEW', margin + 4, y + 6.5);
    y += 16;
  }

  // ── Behavioral Stats ────────────────────────────────────────
  doc.setTextColor(107, 117, 145);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BEHAVIORAL STATISTICS', margin, y);
  y += 4;

  doc.setDrawColor(30, 37, 53);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 6;

  const stats = [
    ['Tab Switches', session.stats?.tabSwitches || 0, [255, 159, 67]],
    ['Copy Attempts', session.stats?.copyAttempts || 0, [255, 71, 87]],
    ['Paste Attempts', session.stats?.pasteAttempts || 0, [255, 71, 87]],
    ['Window Blurs', session.stats?.windowBlurs || 0, [255, 209, 102]],
    ['Dev Tools Attempts', session.stats?.devToolsAttempts || 0, [255, 71, 87]],
    ['Fullscreen Exits', session.stats?.fullscreenExits || 0, [255, 159, 67]],
    ['Idle Periods', session.stats?.idlePeriods || 0, [255, 209, 102]],
    ['Right Clicks', session.stats?.rightClicks || 0, [107, 117, 145]],
    ['Keyboard Shortcuts', session.stats?.keyboardShortcuts || 0, [107, 117, 145]],
  ];

  const colW = (contentW - 8) / 3;
  stats.forEach(([label, val, color], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = margin + col * (colW + 4);
    const by = y + row * 20;

    doc.setFillColor(22, 27, 39);
    doc.roundedRect(bx, by, colW, 16, 2, 2, 'F');

    // Colored left accent
    doc.setFillColor(...color);
    doc.roundedRect(bx, by, 3, 16, 1, 1, 'F');

    doc.setTextColor(107, 117, 145);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, bx + 7, by + 6);

    doc.setTextColor(val > 0 ? color[0] : 107, val > 0 ? color[1] : 117, val > 0 ? color[2] : 145);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), bx + 7, by + 13);
  });

  y += Math.ceil(stats.length / 3) * 20 + 10;

  // ── Event Log ───────────────────────────────────────────────
  doc.setTextColor(107, 117, 145);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`EVENT LOG (${session.behavioralEvents?.length || 0} events)`, margin, y);
  y += 4;
  doc.setDrawColor(30, 37, 53);
  doc.line(margin, y, W - margin, y);
  y += 4;

  const severityColor = { low: [107, 117, 145], medium: [255, 209, 102], high: [255, 71, 87] };
  const eventLabels = {
    tab_switch: 'Tab Switch', copy_attempt: 'Copy Attempt', paste_attempt: 'Paste Attempt',
    window_blur: 'Window Blur', dev_tools_attempt: 'Dev Tools Opened', right_click: 'Right Click',
    keyboard_shortcut: 'Keyboard Shortcut', fullscreen_exit: 'Fullscreen Exit', idle_detected: 'Idle Period',
    window_focus: 'Window Focus',
  };

  const events = [...(session.behavioralEvents || [])].reverse().slice(0, 40);

  if (events.length === 0) {
    doc.setTextColor(107, 117, 145);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No behavioral events recorded.', margin, y + 8);
    y += 16;
  } else {
    events.forEach((ev, i) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      const sc = severityColor[ev.severity] || [107, 117, 145];
      doc.setFillColor(22, 27, 39);
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFillColor(...sc);
      doc.rect(margin, y, 2, 7, 'F');

      doc.setTextColor(...sc);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text((ev.severity || 'low').toUpperCase(), margin + 5, y + 4.5);

      doc.setTextColor(232, 234, 240);
      doc.setFont('helvetica', 'normal');
      doc.text(eventLabels[ev.type] || ev.type, margin + 22, y + 4.5);

      doc.setTextColor(107, 117, 145);
      const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '';
      doc.text(ts, W - margin, y + 4.5, { align: 'right' });

      y += 8;
    });

    if (session.behavioralEvents?.length > 40) {
      doc.setTextColor(107, 117, 145);
      doc.setFontSize(8);
      doc.text(`... and ${session.behavioralEvents.length - 40} more events`, margin, y + 4);
      y += 10;
    }
  }

  // ── Footer ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(10, 12, 16);
    doc.rect(0, 285, W, 12, 'F');
    doc.setTextColor(61, 69, 101);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ExamGuard · Behavioral Integrity System · Confidential', margin, 292);
    doc.text(`Page ${p} of ${totalPages}`, W - margin, 292, { align: 'right' });
  }

  // Save
  const filename = `examguard-report-${session.student?.name?.replace(/\s+/g, '-') || 'student'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
