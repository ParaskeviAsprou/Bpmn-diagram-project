package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.springframework.http.ResponseEntity.*;

@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@RestController
@RequestMapping("/api/v1/folders") // CHANGED: Different base mapping to avoid conflicts
public class FolderController {

    @Autowired
    private FolderService folderService;

    // =================== CREATE FOLDER ===================

    @PostMapping("/create")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Folder> createFolder(@RequestBody CreateFolderRequest request, Principal principal) {
        try {
            String createdBy = principal != null ? principal.getName() : "anonymous";

            // Simplified - only create simple folders, no parent-child relationships
            Folder newFolder = folderService.createSimpleFolder(
                    request.getFolderName(),
                    request.getDescription(),
                    createdBy
            );

            return new ResponseEntity<>(newFolder, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // =================== GET FOLDERS ===================

    @GetMapping("/all")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Folder>> getAllFolders() {
        try {
            List<Folder> folders = folderService.getAllSimpleFolders();
            return ok(folders);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{folderId}")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Folder> getFolder(@PathVariable Long folderId) {
        try {
            return folderService.getFolderById(folderId)
                    .map(folder -> ok(folder))
                    .orElse(notFound().build());
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // =================== DELETE FOLDER ===================

    @DeleteMapping("/delete/{folderId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteFolder(@PathVariable Long folderId) {
        try {
            folderService.deleteFolder(folderId);
            return ok(Map.of("message", "Folder deleted successfully"));
        } catch (Exception e) {
            return badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =================== FOLDER OPERATIONS ===================

    @PutMapping("/{folderId}/rename")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Folder> renameFolder(
            @PathVariable Long folderId,
            @RequestBody Map<String, String> request,
            Principal principal) {
        try {
            String newName = request.get("folderName");
            String updatedBy = principal != null ? principal.getName() : "anonymous";

            Folder updatedFolder = folderService.renameFolder(folderId, newName, updatedBy);
            return ok(updatedFolder);
        } catch (Exception e) {
            return badRequest().body(null);
        }
    }

    @PutMapping("/{folderId}/description")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Folder> updateDescription(
            @PathVariable Long folderId,
            @RequestBody Map<String, String> request,
            Principal principal) {
        try {
            String description = request.get("description");
            String updatedBy = principal != null ? principal.getName() : "anonymous";

            Folder updatedFolder = folderService.updateFolderDescription(folderId, description, updatedBy);
            return ok(updatedFolder);
        } catch (Exception e) {
            return badRequest().body(null);
        }
    }

    // =================== FOLDER STATS ===================

    @GetMapping("/{folderId}/stats")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<FolderService.FolderStats> getFolderStats(@PathVariable Long folderId) {
        try {
            FolderService.FolderStats stats = folderService.getFolderStats(folderId);
            return ok(stats);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    public static class CreateFolderRequest {
        private String folderName;
        private String description;
        private String createdBy;

        // Getters and Setters
        public String getFolderName() { return folderName; }
        public void setFolderName(String folderName) { this.folderName = folderName; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getCreatedBy() { return createdBy; }
        public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    }
}