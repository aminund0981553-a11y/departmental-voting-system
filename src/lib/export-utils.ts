import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function downloadResultsPDF(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  sections: { position: string; rows: { name: string; votes: number }[] }[];
  totalVotes: number;
}) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  if (opts.subtitle) doc.text(opts.subtitle, 14, 25);
  doc.text(`Total ballots cast: ${opts.totalVotes}`, 14, 31);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

  let y = 45;
  for (const s of opts.sections) {
    doc.setFontSize(12);
    doc.setTextColor(11, 37, 69);
    doc.text(s.position, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Candidate", "Votes", "%"]],
      body: s.rows.map((r) => {
        const total = s.rows.reduce((a, b) => a + b.votes, 0);
        const pct = total ? ((r.votes / total) * 100).toFixed(1) + "%" : "0%";
        return [r.name, r.votes, pct];
      }),
      headStyles: { fillColor: [11, 37, 69] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error autotable adds lastAutoTable
    y = (doc.lastAutoTable?.finalY ?? y + 30) + 10;
    if (y > 260) { doc.addPage(); y = 20; }
  }

  doc.save(opts.filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseCSV<T = Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.data),
      error: reject,
    });
  });
}
