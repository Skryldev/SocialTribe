import React, { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface PdfExporterProps {
  targetRef?: React.RefObject<HTMLElement>;
}

export default function PdfExporter({ targetRef }: PdfExporterProps): React.ReactElement {
  const [exporting, setExporting] = useState<boolean>(false);

  const exportPDF = useCallback(async () => {
    const el = targetRef?.current ?? document.getElementById("dashboard-root");
    if (!el) return;

    setExporting(true);
    
    const originalOverflow = document.body.style.overflow;
    const originalHeight = el.style.height;
    const originalPosition = el.style.position;
    const scrollY = window.scrollY;
    
    try {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
      
      const fullHeight = el.scrollHeight;
      el.style.height = `${fullHeight}px`;
      el.style.position = 'relative';
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
        cacheBust: true,
        width: el.scrollWidth,
        height: fullHeight,
      });

      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdfW = 210;
      const pdfH = (img.height * pdfW) / img.width;
      const pageH = 297;
      const totalPages = Math.ceil(pdfH / pageH);
      
      const pdf = new jsPDF({ 
        orientation: "portrait", 
        unit: "mm", 
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        const yOffset = i * pageH;
        pdf.addImage(dataUrl, "PNG", 0, -yOffset, pdfW, pdfH);
      }

      const ts = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      pdf.save(`network-dashboard-${ts}.pdf`);
      
    } catch (err: any) {
      console.error("PDF export failed:", err);
      alert("PDF export failed: " + (err.message || "Unknown error"));
    } finally {
      document.body.style.overflow = originalOverflow;
      el.style.height = originalHeight;
      el.style.position = originalPosition;
      window.scrollTo(0, scrollY);
      setExporting(false);
    }
  }, [targetRef]);

  return (
    <button
      className="btn btn-export"
      onClick={exportPDF}
      disabled={exporting}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {exporting ? (
        <>
          <span className="spinner-small" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download size={14} />
          <span>Export to PDF</span>
        </>
      )}
    </button>
  );
}