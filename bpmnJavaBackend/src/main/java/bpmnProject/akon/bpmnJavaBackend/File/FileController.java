package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/v1/file")
public class FileController {

    private final FileService fileService;
    private final BpmnPdfService bpmnPdfService;

    @Autowired
    public FileController(FileService fileService, BpmnPdfService bpmnPdfService) {
        this.fileService = fileService;
        this.bpmnPdfService = bpmnPdfService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> uploadFile(@RequestParam("file") MultipartFile multipartFile) throws IOException {
        try {
            System.out.println("Upload endpoint reached. File: " + multipartFile.getOriginalFilename());

            File file = new File();
            file.setFileName(multipartFile.getOriginalFilename());
            file.setFileType(multipartFile.getContentType());
            file.setFileSize(multipartFile.getSize());
            file.setData(multipartFile.getBytes());
            file.setUploadTime(LocalDateTime.now());

            File saved = fileService.uploadFile(file);
            System.out.println("File uploaded successfully: " + saved.getFileName());
            return new ResponseEntity<>(saved, HttpStatus.CREATED);
        } catch (Exception e) {
            System.err.println("Error uploading file: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<File>> getAllFiles() {
        try {
            List<File> files = fileService.getAllFiles();
            // Convert binary data to base64 for JSON serialization
            files.forEach(file -> {
                if (file.getData() != null) {
                    file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getData()));
                    // Don't send raw data in the list view
                    file.setData(null);
                }
            });
            return new ResponseEntity<>(files, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> getFileById(@PathVariable("id") Long id) {
        try {
            File file = fileService.findFileById(id);
            // Include content for file viewing
            if (file.getData() != null) {
                file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getData()));
            }
            return new ResponseEntity<>(file, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/file/{filename}")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> getFileByFilename(@PathVariable("filename") String filename) {
        try {
            File file = fileService.findFileByFilename(filename);
            if (file.getData() != null) {
                file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getData()));
            }
            return new ResponseEntity<>(file, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/delete/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteFile(@PathVariable Long id) {
        try {
            fileService.deleteByFile(id);
            return new ResponseEntity<>(Map.of("message", "File deleted successfully"), HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(Map.of("error", "Failed to delete file"), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}/export/pdf")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportFileToPdf(@PathVariable Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] pdfBytes = bpmnPdfService.convertBpmnToPdf(file);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                    (file.getFileName() != null ? file.getFileName().replace(".bpmn", "").replace(".xml", "") : "diagram") + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error exporting to PDF: " + e.getMessage()).getBytes());
        }
    }

    @PostMapping("/{id}/export/pdf")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportFileToPdfWithMetadata(
            @PathVariable Long id,
            @RequestBody Map<String, Object> metadata) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] pdfBytes = bpmnPdfService.convertBpmnToPdfWithMetadata(file, metadata);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                    (file.getFileName() != null ? file.getFileName().replace(".bpmn", "").replace(".xml", "") : "diagram") + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error exporting to PDF: " + e.getMessage()).getBytes());
        }
    }

    @GetMapping("/{id}/export/{format}")
    public ResponseEntity<byte[]> exportFile(@PathVariable Long id, @PathVariable String format){
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] exportedData;
            MediaType mediaType;
            String fileExtension;

            switch (format.toLowerCase()) {
                case "pdf":
                    exportedData = bpmnPdfService.convertBpmnToPdf(file);
                    mediaType = MediaType.APPLICATION_PDF;
                    fileExtension = ".pdf";
                    break;
                case "svg":
                    exportedData = bpmnPdfService.convertBpmnToSvg(file);
                    mediaType = MediaType.valueOf("image/svg+xml");
                    fileExtension = ".svg";
                    break;
                case "png":
                    exportedData = bpmnPdfService.convertBpmnToPng(file);
                    mediaType = MediaType.IMAGE_PNG;
                    fileExtension = ".png";
                    break;
                case "xml":
                default:
                    exportedData = file.getData();
                    mediaType = MediaType.APPLICATION_XML;
                    fileExtension = ".xml";
                    break;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(mediaType);
            headers.setContentDispositionFormData("attachment",
                    (file.getFileName() != null ?
                            file.getFileName().replaceAll("\\.(bpmn|xml)$", "") :
                            "diagram") + fileExtension);
            headers.setContentLength(exportedData.length);

            return new ResponseEntity<>(exportedData, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error exporting file: " + e.getMessage()).getBytes());
        }
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> validateBpmnFile(@PathVariable Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> validationResult = bpmnPdfService.validateBpmnFile(file);
            return new ResponseEntity<>(validationResult, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Validation failed: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> getFilePreview(@PathVariable Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] previewData = bpmnPdfService.generatePreview(file);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentLength(previewData.length);

            return new ResponseEntity<>(previewData, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            ByteArrayResource resource = new ByteArrayResource(file.getData());

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + file.getFileName() + "\"");
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentLength(file.getData().length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/content")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<String> getFileContent(@PathVariable Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            String content = new String(file.getData());
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(content);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error reading file content: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> updateFile(@PathVariable Long id, @RequestParam("file") MultipartFile multipartFile) {
        try {
            File existingFile = fileService.findFileById(id);
            if (existingFile == null) {
                return ResponseEntity.notFound().build();
            }

            existingFile.setFileName(multipartFile.getOriginalFilename());
            existingFile.setFileType(multipartFile.getContentType());
            existingFile.setFileSize(multipartFile.getSize());
            existingFile.setData(multipartFile.getBytes());
            existingFile.setUploadTime(LocalDateTime.now());

            File updatedFile = fileService.updateFile(existingFile);
            return new ResponseEntity<>(updatedFile, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}