package bpmnProject.akon.bpmnJavaBackend.File;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final FileVersionService fileVersionService;
    private final FolderService folderService;
    private final ElementAttachmentService elementAttachmentService;
    private final BpmnPdfService bpmnPdfService;

    @Autowired
    public FileController(FileService fileService, FileVersionService fileVersionService, FolderService folderService, ElementAttachmentService elementAttachmentService, BpmnPdfService bpmnPdfService) {
        this.fileService = fileService;
        this.fileVersionService = fileVersionService;
        this.folderService = folderService;
        this.elementAttachmentService = elementAttachmentService;
        this.bpmnPdfService = bpmnPdfService;
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

    @PostMapping("/upload")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> uploadFile(
            @RequestParam("file") MultipartFile multipartFile,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "tags", required = false) String tags) throws IOException {
        try {
            String currentUser = getCurrentUsername();
            File file = fileService.uploadFileToFolder(multipartFile, folderId, description, tags, currentUser);
            return new ResponseEntity<>(file, HttpStatus.CREATED);
        } catch (Exception e) {
            System.err.println("Error uploading file: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/{id}/save-version")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<FileVersion> saveNewVersion(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile newContent,
            @RequestParam(value = "versionNotes", required = false) String versionNotes) throws IOException {
        try {
            String currentUser = getCurrentUsername();
            FileVersion version = fileVersionService.createNewVersion(id, newContent.getBytes(), versionNotes, currentUser);
            return ResponseEntity.ok(version);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/save-as-new")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> saveAsNewFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile newContent,
            @RequestParam("newFileName") String newFileName,
            @RequestParam(value = "versionNotes", required = false) String versionNotes) throws IOException {
        try {
            String currentUser = getCurrentUsername();
            File newFile = fileVersionService.createNewFileFromVersion(id, newContent.getBytes(), newFileName, versionNotes, currentUser);
            return ResponseEntity.ok(newFile);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<FileVersion>> getFileVersions(@PathVariable Long id) {
        try {
            List<FileVersion> versions = fileVersionService.getFileVersions(id);
            // Convert binary data to base64 for JSON response
            versions.forEach(version -> {
                if (version.getData() != null) {
                    version.setBase64Data(java.util.Base64.getEncoder().encodeToString(version.getData()));
                    version.setData(null); // Don't send raw data
                }
            });
            return ResponseEntity.ok(versions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{id}/versions/{versionNumber}")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<FileVersion> getFileVersion(@PathVariable Long id, @PathVariable Integer versionNumber) {
        try {
            FileVersion version = fileVersionService.getFileVersion(id, versionNumber)
                    .orElseThrow(() -> new RuntimeException("Version not found"));

            if (version.getData() != null) {
                version.setBase64Data(java.util.Base64.getEncoder().encodeToString(version.getData()));
                version.setData(null);
            }
            return ResponseEntity.ok(version);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/restore-version/{versionNumber}")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> restoreVersion(@PathVariable Long id, @PathVariable Integer versionNumber) {
        try {
            String currentUser = getCurrentUsername();
            File restoredFile = fileVersionService.restoreVersion(id, versionNumber, currentUser);
            return ResponseEntity.ok(restoredFile);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // =================== FOLDER MANAGEMENT ===================

    @PostMapping("/folders")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Folder> createFolder(
            @RequestParam("folderName") String folderName,
            @RequestParam(value = "parentFolderId", required = false) Long parentFolderId,
            @RequestParam(value = "description", required = false) String description) {
        try {
            String currentUser = getCurrentUsername();
            Folder folder;

            if (parentFolderId != null) {
                folder = folderService.createSubFolder(parentFolderId, folderName, description, currentUser);
            } else {
                folder = folderService.createRootFolder(folderName, description, currentUser);
            }

            return ResponseEntity.ok(folder);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/folders")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<Folder>> getRootFolders() {
        List<Folder> folders = folderService.getRootFolders();
        return ResponseEntity.ok(folders);
    }

    @GetMapping("/folders/{folderId}")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Folder> getFolder(@PathVariable Long folderId) {
        return folderService.getFolderWithStats(folderId)
                .map(folder -> ResponseEntity.ok(folder))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/folders/{folderId}/subfolders")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<Folder>> getSubFolders(@PathVariable Long folderId) {
        List<Folder> subFolders = folderService.getSubFolders(folderId);
        return ResponseEntity.ok(subFolders);
    }

    @GetMapping("/folders/{folderId}/files")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<File>> getFolderFiles(@PathVariable Long folderId) {
        List<File> files = fileService.getFilesInFolder(folderId);
        files.forEach(file -> {
            if (file.getData() != null) {
                file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getData()));
                file.setData(null);
            }
        });
        return ResponseEntity.ok(files);
    }

    @PostMapping("/folders/{folderId}/move")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Folder> moveFolder(
            @PathVariable Long folderId,
            @RequestParam(value = "newParentFolderId", required = false) Long newParentFolderId) {
        try {
            String currentUser = getCurrentUsername();
            Folder movedFolder = folderService.moveFolder(folderId, newParentFolderId, currentUser);
            return ResponseEntity.ok(movedFolder);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/folders/{folderId}")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Folder> renameFolder(
            @PathVariable Long folderId,
            @RequestParam("newName") String newName) {
        try {
            String currentUser = getCurrentUsername();
            Folder renamedFolder = folderService.renameFolder(folderId, newName, currentUser);
            return ResponseEntity.ok(renamedFolder);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/folders/{folderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteFolder(@PathVariable Long folderId) {
        try {
            folderService.deleteFolder(folderId);
            return ResponseEntity.ok(Map.of("message", "Folder deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/folders/tree")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<FolderService.FolderTreeNode>> getFolderTree() {
        List<FolderService.FolderTreeNode> tree = folderService.getFolderTree();
        return ResponseEntity.ok(tree);
    }

    // =================== ELEMENT ATTACHMENTS ===================

    @PostMapping("/{fileId}/elements/{elementId}/attachments")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<ElementAttachment> addElementAttachment(
            @PathVariable Long fileId,
            @PathVariable String elementId,
            @RequestParam("attachment") MultipartFile attachment,
            @RequestParam(value = "elementType", required = false) String elementType,
            @RequestParam(value = "description", required = false) String description) throws IOException {
        try {
            String currentUser = getCurrentUsername();
            ElementAttachment savedAttachment = elementAttachmentService.addElementAttachment(
                    fileId, elementId, elementType, attachment, description, currentUser);
            return ResponseEntity.ok(savedAttachment);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{fileId}/elements/{elementId}/attachments")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<ElementAttachment>> getElementAttachments(
            @PathVariable Long fileId,
            @PathVariable String elementId) {
        List<ElementAttachment> attachments = elementAttachmentService.getElementAttachments(fileId, elementId);
        return ResponseEntity.ok(attachments);
    }

    @GetMapping("/attachments/{attachmentId}")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<ElementAttachment> getAttachment(@PathVariable Long attachmentId) {
        return elementAttachmentService.getAttachment(attachmentId)
                .map(attachment -> {
                    if (attachment.getAttachmentData() != null) {
                        attachment.setBase64Data(java.util.Base64.getEncoder().encodeToString(attachment.getAttachmentData()));
                        attachment.setAttachmentData(null);
                    }
                    return ResponseEntity.ok(attachment);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/attachments/{attachmentId}/download")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentId) {
        try {
            ElementAttachment attachment = elementAttachmentService.getAttachment(attachmentId)
                    .orElseThrow(() -> new RuntimeException("Attachment not found"));

            if (!attachment.getIsDownloadable()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            ByteArrayResource resource = new ByteArrayResource(attachment.getAttachmentData());

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + attachment.getOriginalFilename() + "\"");
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentLength(attachment.getAttachmentData().length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/attachments/{attachmentId}")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteAttachment(@PathVariable Long attachmentId) {
        try {
            elementAttachmentService.deleteAttachment(attachmentId);
            return ResponseEntity.ok(Map.of("message", "Attachment deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =================== SEARCH ===================

    @GetMapping("/search")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> searchFiles(
            @RequestParam("query") String query,
            @RequestParam(value = "folderId", required = false) Long folderId) {
        try {
            List<File> files = fileService.searchFiles(query, folderId);
            List<Folder> folders = folderService.searchFolders(query);
            List<ElementAttachment> attachments = elementAttachmentService.searchAttachments(query);

            // Clean data for JSON response
            files.forEach(file -> {
                if (file.getData() != null) {
                    file.setData(null);
                }
            });

            Map<String, Object> results = Map.of(
                    "files", files,
                    "folders", folders,
                    "attachments", attachments,
                    "totalResults", files.size() + folders.size() + attachments.size()
            );

            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // =================== EXISTING METHODS (Updated) ===================

    @GetMapping("/all")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<File>> getAllFiles() {
        try {
            List<File> files = fileService.getAllFiles();
            files.forEach(file -> {
                if (file.getData() != null) {
                    file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getData()));
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
            if (file.getData() != null) {
                file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getData()));
            }
            return new ResponseEntity<>(file, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{fileId}/move-to-folder")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<File> moveFileToFolder(
            @PathVariable Long fileId,
            @RequestParam(value = "folderId", required = false) Long folderId) {
        try {
            File movedFile = folderService.moveFileToFolder(fileId, folderId);
            return ResponseEntity.ok(movedFile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }
}