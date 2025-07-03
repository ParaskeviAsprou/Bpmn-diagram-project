package bpmnProject.akon.bpmnJavaBackend.File;

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
import java.util.Optional;

import static org.springframework.http.ResponseEntity.*;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/v1/file")
public class FileController {

    private final FileService fileService;
    private final FolderService folderService;
    private final BpmnPdfService bpmnPdfService;
    private final FileRepository fileRepository;

    @Autowired
    private FileVersionRepository fileVersionRepository;

    @Autowired
    private FileVersionService fileVersionService;

    @Autowired
    public FileController(FileService fileService, FolderService folderService,
                          BpmnPdfService bpmnPdfService, FileRepository fileRepository) {
        this.fileService = fileService;
        this.folderService = folderService;
        this.bpmnPdfService = bpmnPdfService;
        this.fileRepository = fileRepository;
    }

    // =================== BPMN DIAGRAM SAVE ===================

    @PostMapping("/save")
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateFileContent(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
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

    // =================== FILE OPERATIONS ===================

    @GetMapping("/all")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<File>> getAllFiles() {
        try {
            List<File> files = fileService.getAllFiles();
            files.forEach(this::prepareFileForResponse);
            return ok(files);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/root-files")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFileById(@PathVariable("id") Long id) {
        try {
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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('MODELER') or hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
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

    // =================== FOLDER OPERATIONS ===================

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

            return ok(folder);
        } catch (Exception e) {
            return badRequest().build();
        }
    }

    @GetMapping("/folders")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<Folder>> getRootFolders() {
        List<Folder> folders = folderService.getRootFolders();
        return ok(folders);
    }

    @GetMapping("/folders/{folderId}")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<Folder> getFolder(@PathVariable Long folderId) {
        return folderService.getFolderWithStats(folderId)
                .map(folder -> ok(folder))
                .orElse(notFound().build());
    }

    @GetMapping("/folders/{folderId}/subfolders")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<Folder>> getSubFolders(@PathVariable Long folderId) {
        List<Folder> subFolders = folderService.getSubFolders(folderId);
        return ok(subFolders);
    }

    @GetMapping("/folders/{folderId}/files")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFolderFiles(@PathVariable Long folderId) {
        try {
            Optional<Folder> folderOpt = folderService.getFolderWithStats(folderId);
            if (!folderOpt.isPresent()) {
                return badRequest()
                        .body(Map.of("error", "Folder not found with id: " + folderId));
            }

            List<File> files = fileService.getFilesInFolder(folderId);
            files.forEach(this::prepareFileForResponse);

            return ok(files);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve files: " + e.getMessage()));
        }
    }

    @DeleteMapping("/folders/delete/{folderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteFolder(@PathVariable Long folderId) {
        try {
            folderService.deleteFolder(folderId);
            return ok(Map.of("message", "Folder deleted successfully"));
        } catch (Exception e) {
            return badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =================== FILE EXISTENCE CHECK ===================

    @PostMapping("/folders/{folderId}/files/check-exists")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
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

    @PostMapping("/root-files/check-exists")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
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
}