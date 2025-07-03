package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class DownloadService {

    private final FileService fileService;
    private final BpmnPdfService bpmnPdfService;

    @Autowired
    public DownloadService(FileService fileService, BpmnPdfService bpmnPdfService) {
        this.fileService = fileService;
        this.bpmnPdfService = bpmnPdfService;
    }

    /**
     * Download PDF export of a BPMN file
     */
    public ResponseEntity<byte[]> downloadPdf(Long fileId) {
        try {
            File file = fileService.findFileById(fileId);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] pdfData = bpmnPdfService.convertBpmnToPdf(file);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                    generatePdfFileName(file.getFileName()));
            headers.setContentLength(pdfData.length);

            return new ResponseEntity<>(pdfData, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Download original file
     */
    public ResponseEntity<byte[]> downloadOriginalFile(Long fileId) {
        try {
            File file = fileService.findFileById(fileId);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] data = getFileBytes(file);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(determineMediaType(file.getFileType()));
            headers.setContentDispositionFormData("attachment", file.getFileName());
            headers.setContentLength(data.length);

            return new ResponseEntity<>(data, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Download file in specified format
     */
    public ResponseEntity<byte[]> downloadFileInFormat(Long fileId, String format) {
        try {
            File file = fileService.findFileById(fileId);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] data;
            MediaType mediaType;
            String fileName;

            switch (format.toLowerCase()) {
                case "pdf":
                    data = bpmnPdfService.convertBpmnToPdf(file);
                    mediaType = MediaType.APPLICATION_PDF;
                    fileName = generatePdfFileName(file.getFileName());
                    break;
                case "svg":
                    data = bpmnPdfService.convertBpmnToSvg(file);
                    mediaType = MediaType.valueOf("image/svg+xml");
                    fileName = generateFileName(file.getFileName(), ".svg");
                    break;
                case "png":
                    data = bpmnPdfService.convertBpmnToPng(file);
                    mediaType = MediaType.IMAGE_PNG;
                    fileName = generateFileName(file.getFileName(), ".png");
                    break;
                case "xml":
                default:
                    data = getFileBytes(file);
                    mediaType = MediaType.APPLICATION_XML;
                    fileName = file.getFileName();
                    break;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(mediaType);
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setContentLength(data.length);

            return new ResponseEntity<>(data, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Helper method to get file bytes consistently
     */
    private byte[] getFileBytes(File file) {
        // Try to get content from XML field first
        if (file.getXml() != null && !file.getXml().trim().isEmpty()) {
            return file.getXml().getBytes(StandardCharsets.UTF_8);
        }

        // Try fileData field
        if (file.getFileData() != null && !file.getFileData().trim().isEmpty()) {
            return file.getFileData().getBytes(StandardCharsets.UTF_8);
        }

        // Fallback to getData() method for compatibility
        byte[] data = file.getData();
        if (data != null && data.length > 0) {
            return data;
        }

        // Last resort - empty content
        return "No content available".getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Generate PDF filename from original filename
     */
    private String generatePdfFileName(String originalFileName) {
        if (originalFileName == null) {
            return "diagram.pdf";
        }

        String nameWithoutExtension = originalFileName.replaceAll("\\.(bpmn|xml)$", "");
        return nameWithoutExtension + ".pdf";
    }

    /**
     * Generate filename with new extension
     */
    private String generateFileName(String originalFileName, String newExtension) {
        if (originalFileName == null) {
            return "diagram" + newExtension;
        }

        String nameWithoutExtension = originalFileName.replaceAll("\\.(bpmn|xml)$", "");
        return nameWithoutExtension + newExtension;
    }

    /**
     * Determine media type from file type string
     */
    private MediaType determineMediaType(String fileType) {
        if (fileType == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }

        switch (fileType.toLowerCase()) {
            case "application/xml":
            case "text/xml":
            case "bpmn":
                return MediaType.APPLICATION_XML;
            case "application/pdf":
                return MediaType.APPLICATION_PDF;
            case "image/svg+xml":
                return MediaType.valueOf("image/svg+xml");
            case "text/plain":
                return MediaType.TEXT_PLAIN;
            case "image/png":
                return MediaType.IMAGE_PNG;
            case "image/jpeg":
                return MediaType.IMAGE_JPEG;
            default:
                return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}