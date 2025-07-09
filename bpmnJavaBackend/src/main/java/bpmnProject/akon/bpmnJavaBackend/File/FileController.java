package bpmnProject.akon.bpmnJavaBackend.File;

import bpmnProject.akon.bpmnJavaBackend.Config.RBACSecurityService;
import bpmnProject.akon.bpmnJavaBackend.User.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.springframework.http.ResponseEntity.*;

@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@RestController
@RequestMapping("/api/v1/file")
public class FileController {

    private final FileService fileService;
    private final FolderService folderService;
    private final BpmnPdfService bpmnPdfService;
    private final FileRepository fileRepository;
    private final DiagramAssignmentService assignmentService;
    private final RBACSecurityService rbacSecurityService;

    @Autowired
    private FileVersionRepository fileVersionRepository;

    @Autowired
    private FileVersionService fileVersionService;

    @Autowired
    public FileController(FileService fileService, FolderService folderService,
                          BpmnPdfService bpmnPdfService, FileRepository fileRepository, DiagramAssignmentService assignmentService, RBACSecurityService rbacSecurityService) {
        this.fileService = fileService;
        this.folderService = folderService;
        this.bpmnPdfService = bpmnPdfService;
        this.fileRepository = fileRepository;
        this.assignmentService = assignmentService;
        this.rbacSecurityService = rbacSecurityService;
    }

    // =================== BPMN DIAGRAM SAVE ===================

    @PostMapping("/save")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> saveBpmnDiagram(@RequestBody Map<String, Object> payload) {
        try {
            System.out.println("=== SAVE BPMN DIAGRAM DEBUG ===");
            System.out.println("Payload received: " + payload);

            // Extract values from payload
            String name = extractStringValue(payload, "name");
            String xml = extractStringValue(payload, "xml");
            String customProperties = extractStringValue(payload, "customProperties", "{}");
            String elementColors = extractStringValue(payload, "elementColors", "{}");
            Long folderId = extractLongValue(payload, "folderId");
            boolean overwrite = extractBooleanValue(payload, "overwrite", false);

            System.out.println("Extracted values:");
            System.out.println("- name: " + name);
            System.out.println("- xml length: " + (xml != null ? xml.length() : "null"));
            System.out.println("- folderId: " + folderId);
            System.out.println("- overwrite: " + overwrite);

            // Validation
            if (name == null || name.trim().isEmpty()) {
                return badRequest().body(Map.of("error", "File name is required"));
            }

            if (xml == null || xml.trim().isEmpty()) {
                return badRequest().body(Map.of("error", "XML content is required"));
            }

            // Validate JSON format for optional fields
            if (!isValidJson(customProperties)) {
                customProperties = "{}";
            }
            if (!isValidJson(elementColors)) {
                elementColors = "{}";
            }

            String currentUser = getCurrentUsername();
            System.out.println("Current user: " + currentUser);

            // Check if file exists and handle overwrite
            if (fileService.fileExistsInFolder(name.trim(), folderId) && !overwrite) {
                System.out.println("File exists and overwrite=false, returning conflict");
                return status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "File already exists", "exists", true));
            }

            System.out.println("Calling fileService.saveBpmnDiagram...");

            // Save the BPMN diagram
            File savedFile = fileService.saveBpmnDiagram(
                    name.trim(),
                    xml,
                    customProperties,
                    elementColors,
                    folderId,
                    currentUser,
                    overwrite
            );

            if (savedFile == null) {
                return status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to save file - service returned null"));
            }

            System.out.println("File saved successfully with ID: " + savedFile.getId());
            User currentUserEntity = getCurrentUserEntity();
            if (currentUserEntity != null && !currentUserEntity.hasRole("ROLE_ADMIN")) {
                try {
                    assignmentService.assignDiagramToUser(
                            savedFile.getId(),
                            currentUserEntity.getId(),
                            DiagramAssignment.PermissionLevel.ADMIN,
                            currentUser,
                            "Auto-assigned to creator"
                    );
                    System.out.println("Auto-assigned diagram to creator with ADMIN permissions");
                } catch (Exception e) {
                    System.err.println("Failed to auto-assign diagram to creator: " + e.getMessage());
                    // Don't fail the whole operation, just log the error
                }
            }
            // Return the file in the format expected by Angular
            prepareFileForResponse(savedFile);
            return ok(savedFile);

        } catch (IllegalStateException e) {
            System.err.println("=== FILE EXISTS ERROR ===");
            System.err.println("Error: " + e.getMessage());
            return status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage(), "exists", true));

        } catch (IllegalArgumentException e) {
            System.err.println("=== VALIDATION ERROR ===");
            System.err.println("Error: " + e.getMessage());
            return badRequest().body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            System.err.println("=== SAVE DIAGRAM ERROR ===");
            System.err.println("Error type: " + e.getClass().getSimpleName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();

            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save diagram: " + e.getMessage()));
        }
    }

    // =================== UPDATE EXISTING FILE ===================

    @PutMapping("/{id}/content")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> updateFileContent(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            // Check edit permission
            if (!rbacSecurityService.canEditDiagram(id)) {
                return status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You don't have permission to edit this diagram"));
            }

            System.out.println("=== UPDATE FILE CONTENT DEBUG ===");
            System.out.println("File ID: " + id);
            System.out.println("Payload: " + payload);

            String xml = extractStringValue(payload, "xml");
            String customProperties = extractStringValue(payload, "customProperties", "{}");
            String elementColors = extractStringValue(payload, "elementColors", "{}");

            if (xml == null || xml.trim().isEmpty()) {
                return badRequest().body(Map.of("error", "XML content is required"));
            }

            String currentUser = getCurrentUsername();

            // Validate JSON format
            if (!isValidJson(customProperties)) {
                customProperties = "{}";
            }
            if (!isValidJson(elementColors)) {
                elementColors = "{}";
            }

            // Update the file
            File updatedFile = fileService.updateBpmnFileContent(id, xml, customProperties, elementColors, currentUser);

            prepareFileForResponse(updatedFile);
            return ok(updatedFile);

        } catch (Exception e) {
            System.err.println("=== UPDATE FILE ERROR ===");
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();

            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update file: " + e.getMessage()));
        }
    }

    // =================== FILE OPERATIONS ===================

    @GetMapping("/all")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<File>> getAllFiles() {
        try {
            User currentUser = getCurrentUserEntity();
            List<File> files;

            if (currentUser != null && currentUser.hasRole("ROLE_ADMIN")) {
                // Admins see all files
                files = fileService.getAllFiles();
            } else {
                // Non-admins see only assigned files
                files = assignmentService.getAccessibleDiagrams(currentUser);
            }

            files.forEach(this::prepareFileForResponse);
            return ok(files);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/root-files")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<File>> getRootFiles() {
        try {
            List<File> files = fileService.getFilesInFolder(null);
            files.forEach(this::prepareFileForResponse);
            return ok(files);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getFileById(@PathVariable("id") Long id) {
        try {
            // Check access permission
            if (!rbacSecurityService.canViewDiagram(id)) {
                return status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied to this diagram"));
            }

            Optional<File> fileOpt = fileService.getFileById(id);
            if (!fileOpt.isPresent()) {
                return notFound().build();
            }

            File file = fileOpt.get();
            prepareFileForResponse(file);
            return ok(file);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/delete/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> deleteFile(@PathVariable("id") Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "File not found with id: " + id));
            }

            String fileName = file.getFileName();
            fileService.deleteByFile(id);

            return ok(Map.of(
                    "message", "File deleted successfully",
                    "fileName", fileName,
                    "fileId", id
            ));
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete file: " + e.getMessage()));
        }
    }

    // =================== FILE UPLOAD ===================

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile multipartFile,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "customName", required = false) String customName,
            @RequestParam(value = "overwrite", defaultValue = "false") boolean allowOverwrite) {
        try {
            if (multipartFile.isEmpty()) {
                return badRequest().body(Map.of("error", "File is empty"));
            }

            String fileName = customName != null && !customName.trim().isEmpty()
                    ? customName : multipartFile.getOriginalFilename();

            if (!allowOverwrite && fileService.fileExistsInFolder(fileName, folderId)) {
                return status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "File already exists",
                        "fileName", fileName,
                        "exists", true,
                        "folderId", folderId != null ? folderId : "root"
                ));
            }

            String currentUser = getCurrentUsername();
            File file = fileService.uploadFileToFolder(
                    multipartFile, folderId, description, tags, currentUser
            );

            if (customName != null && !customName.trim().isEmpty()) {
                file.setFileName(customName);
                file = fileService.updateFile(file);
            }

            prepareFileForResponse(file);
            return status(HttpStatus.CREATED).body(file);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }

    // =================== EXPORT OPERATIONS ===================

    @GetMapping("/{id}/export/{format}")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<byte[]> exportFile(@PathVariable Long id, @PathVariable String format) {
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
                    String xmlContent = file.getXml() != null ? file.getXml() : file.getFileData();
                    exportedData = xmlContent != null ? xmlContent.getBytes() : new byte[0];
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error exporting file: " + e.getMessage()).getBytes());
        }
    }

    // =================== NEW ARCHIVE EXPORT ===================

    @GetMapping("/{id}/export/archive")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<byte[]> exportFileAsArchive(@PathVariable Long id) {
        try {
            File file = fileService.findFileById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ZipOutputStream zos = new ZipOutputStream(baos);

            String baseName = file.getFileName() != null ?
                    file.getFileName().replaceAll("\\.(bpmn|xml)$", "") : "diagram";

            // Add PDF
            try {
                byte[] pdfData = bpmnPdfService.convertBpmnToPdf(file);
                ZipEntry pdfEntry = new ZipEntry(baseName + ".pdf");
                zos.putNextEntry(pdfEntry);
                zos.write(pdfData);
                zos.closeEntry();
            } catch (Exception e) {
                System.err.println("Failed to add PDF to archive: " + e.getMessage());
            }

            // Add SVG
            try {
                byte[] svgData = bpmnPdfService.convertBpmnToSvg(file);
                ZipEntry svgEntry = new ZipEntry(baseName + ".svg");
                zos.putNextEntry(svgEntry);
                zos.write(svgData);
                zos.closeEntry();
            } catch (Exception e) {
                System.err.println("Failed to add SVG to archive: " + e.getMessage());
            }

            // Add PNG
            try {
                byte[] pngData = bpmnPdfService.convertBpmnToPng(file);
                ZipEntry pngEntry = new ZipEntry(baseName + ".png");
                zos.putNextEntry(pngEntry);
                zos.write(pngData);
                zos.closeEntry();
            } catch (Exception e) {
                System.err.println("Failed to add PNG to archive: " + e.getMessage());
            }

            // Add XML
            try {
                String xmlContent = file.getXml() != null ? file.getXml() : file.getFileData();
                byte[] xmlData = xmlContent != null ? xmlContent.getBytes() : new byte[0];
                ZipEntry xmlEntry = new ZipEntry(baseName + ".xml");
                zos.putNextEntry(xmlEntry);
                zos.write(xmlData);
                zos.closeEntry();
            } catch (Exception e) {
                System.err.println("Failed to add XML to archive: " + e.getMessage());
            }

            zos.close();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.valueOf("application/zip"));
            headers.setContentDispositionFormData("attachment", baseName + "_archive.zip");
            headers.setContentLength(baos.size());

            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error creating archive: " + e.getMessage()).getBytes());
        }
    }

    // =================== FOLDER OPERATIONS ===================

    @GetMapping("/folders/{folderId}/files")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getFolderFiles(@PathVariable Long folderId) {
        try {
            List<File> files = fileService.getFilesInFolder(folderId);
            files.forEach(this::prepareFileForResponse);
            return ok(files);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve files: " + e.getMessage()));
        }
    }

    // =================== FILE EXISTENCE CHECK ===================

    @PostMapping("/folders/{folderId}/files/check-exists")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Boolean>> checkFileExistsInFolder(
            @PathVariable Long folderId,
            @RequestBody Map<String, String> request) {
        try {
            String fileName = request.get("fileName");
            if (fileName == null || fileName.trim().isEmpty()) {
                return badRequest().body(Map.of("exists", false));
            }

            boolean exists = fileService.fileExistsInFolder(fileName, folderId);
            return ok(Map.of("exists", exists));
        } catch (Exception e) {
            return ok(Map.of("exists", false));
        }
    }
    @GetMapping("/{id}/sharing")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getDiagramSharingInfo(@PathVariable Long id) {
        try {
            // Check if user can view sharing info (must have access to diagram)
            if (!rbacSecurityService.canViewDiagram(id)) {
                return status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied to this diagram"));
            }

            List<DiagramAssignment> assignments = assignmentService.getDiagramAssignments(id);
            boolean canAssign = rbacSecurityService.canAssignDiagram(id);

            return ok(Map.of(
                    "assignments", assignments,
                    "canAssign", canAssign
            ));
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get sharing info: " + e.getMessage()));
        }
    }
    @GetMapping("/{id}/access-info")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getFileAccessInfo(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUserEntity();
            if (currentUser == null) {
                return status(HttpStatus.UNAUTHORIZED).build();
            }

            boolean canView = rbacSecurityService.canViewDiagram(id);
            boolean canEdit = rbacSecurityService.canEditDiagram(id);
            boolean canAssign = rbacSecurityService.canAssignDiagram(id);

            DiagramAssignment.PermissionLevel permissionLevel = null;
            if (canView) {
                permissionLevel = assignmentService.getUserPermissionLevel(id, currentUser);
            }

            return ok(Map.of(
                    "canView", canView,
                    "canEdit", canEdit,
                    "canAssign", canAssign,
                    "permissionLevel", permissionLevel != null ? permissionLevel : "NONE"
            ));
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get access info: " + e.getMessage()));
        }
    }
    @PostMapping("/root-files/check-exists")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Boolean>> checkFileExistsInRoot(
            @RequestBody Map<String, String> request) {
        try {
            String fileName = request.get("fileName");
            if (fileName == null || fileName.trim().isEmpty()) {
                return badRequest().body(Map.of("exists", false));
            }

            boolean exists = fileService.fileExistsInFolder(fileName, null);
            return ok(Map.of("exists", exists));
        } catch (Exception e) {
            return ok(Map.of("exists", false));
        }
    }

    // =================== HELPER METHODS ===================

    private String extractStringValue(Map<String, Object> payload, String key) {
        return extractStringValue(payload, key, null);
    }

    private String extractStringValue(Map<String, Object> payload, String key, String defaultValue) {
        Object value = payload.get(key);
        return value != null ? value.toString() : defaultValue;
    }

    private Long extractLongValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value != null) {
            try {
                if (value instanceof Number) {
                    return ((Number) value).longValue();
                } else if (value instanceof String) {
                    return Long.valueOf((String) value);
                }
            } catch (NumberFormatException e) {
                System.err.println("Invalid number format for key " + key + ": " + value);
            }
        }
        return null;
    }

    private boolean extractBooleanValue(Map<String, Object> payload, String key, boolean defaultValue) {
        Object value = payload.get(key);
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return defaultValue;
    }

    private boolean isValidJson(String jsonString) {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            return true;
        }
        try {
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(jsonString);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // =================== UTILITY METHODS ===================

    private void prepareFileForResponse(File file) {
        if (file.getFileData() != null) {
            file.setBase64Data(java.util.Base64.getEncoder().encodeToString(file.getFileData().getBytes()));
        }
    }
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }
    private User getCurrentUserEntity() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof UsernamePasswordAuthenticationToken) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                return (User) principal;
            }
        }
        return null;
    }
}