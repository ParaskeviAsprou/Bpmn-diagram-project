package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.stereotype.Service;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;

import java.io.ByteArrayOutputStream;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.Map;

@Service
public class BpmnPdfService {

    /**
     * Convert BPMN file to PDF
     */
    public byte[] convertBpmnToPdf(File file) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);

            // Add title
            document.add(new Paragraph("BPMN Diagram: " + file.getFileName())
                    .setFontSize(16)
                    .setBold());

            // Add diagram content info
            document.add(new Paragraph("File Type: " + file.getFileType()));
            document.add(new Paragraph("Upload Time: " + file.getUploadTime()));
            document.add(new Paragraph("File Size: " + formatFileSize(file.getFileSize())));

            // Add XML content (truncated for display)
            String xmlContent = new String(file.getData());
            if (xmlContent.length() > 1000) {
                xmlContent = xmlContent.substring(0, 1000) + "...";
            }
            document.add(new Paragraph("BPMN XML Content (preview):"));
            document.add(new Paragraph(xmlContent).setFontSize(8));

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to convert BPMN to PDF", e);
        }
    }

    /**
     * Convert BPMN file to PDF with custom metadata
     */
    public byte[] convertBpmnToPdfWithMetadata(File file, Map<String, Object> metadata) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);

            // Add metadata to PDF info
            if (metadata.containsKey("title")) {
                pdfDoc.getDocumentInfo().setTitle(metadata.get("title").toString());
            }
            if (metadata.containsKey("author")) {
                pdfDoc.getDocumentInfo().setAuthor(metadata.get("author").toString());
            }

            // Add title
            document.add(new Paragraph("BPMN Diagram: " + file.getFileName())
                    .setFontSize(16)
                    .setBold());

            // Add metadata info
            metadata.forEach((key, value) -> {
                document.add(new Paragraph(key + ": " + value.toString()));
            });

            // Add file info
            document.add(new Paragraph("File Type: " + file.getFileType()));
            document.add(new Paragraph("Upload Time: " + file.getUploadTime()));
            document.add(new Paragraph("File Size: " + formatFileSize(file.getFileSize())));

            // Add XML content
            String xmlContent = new String(file.getData());
            if (xmlContent.length() > 1000) {
                xmlContent = xmlContent.substring(0, 1000) + "...";
            }
            document.add(new Paragraph("BPMN XML Content (preview):"));
            document.add(new Paragraph(xmlContent).setFontSize(8));

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to convert BPMN to PDF with metadata", e);
        }
    }

    /**
     * Convert BPMN to SVG (placeholder implementation)
     */
    public byte[] convertBpmnToSvg(File file) {
        String svg = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<svg width=\"400\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\">\n" +
                "  <rect x=\"10\" y=\"10\" width=\"380\" height=\"180\" fill=\"lightblue\" stroke=\"black\"/>\n" +
                "  <text x=\"200\" y=\"100\" text-anchor=\"middle\" font-size=\"16\">" + file.getFileName() + "</text>\n" +
                "  <text x=\"200\" y=\"130\" text-anchor=\"middle\" font-size=\"12\">BPMN Diagram SVG Placeholder</text>\n" +
                "</svg>";
        return svg.getBytes();
    }

    /**
     * Convert BPMN to PNG (placeholder implementation)
     */
    public byte[] convertBpmnToPng(File file) {
        // This would require additional libraries like batik for SVG to PNG conversion
        // For now, return empty array
        return new byte[0];
    }

    /**
     * Validate BPMN file
     */
    public Map<String, Object> validateBpmnFile(File file) {
        Map<String, Object> result = new HashMap<>();

        try {
            String xmlContent = new String(file.getData());

            boolean isValidXml = xmlContent.contains("<?xml") && xmlContent.contains("bpmn:");
            boolean hasDefinitions = xmlContent.contains("bpmn:definitions");
            boolean hasProcess = xmlContent.contains("bpmn:process");

            result.put("valid", isValidXml && hasDefinitions);

            if (!isValidXml) {
                result.put("errors", java.util.Arrays.asList("Invalid XML format or missing BPMN namespace"));
            } else if (!hasDefinitions) {
                result.put("errors", java.util.Arrays.asList("Missing BPMN definitions element"));
            } else if (!hasProcess) {
                result.put("warnings", java.util.Arrays.asList("No process definition found"));
            }

        } catch (Exception e) {
            result.put("valid", false);
            result.put("errors", java.util.Arrays.asList("Failed to parse file: " + e.getMessage()));
        }

        return result;
    }

    /**
     * Generate preview/thumbnail
     */
    public byte[] generatePreview(File file) {
        // Return a simple placeholder image for now
        // In a real implementation, you'd generate an actual preview
        return new byte[0];
    }

    /**
     * Format file size for display
     */
    private String formatFileSize(Long bytes) {
        if (bytes == null || bytes == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }


}