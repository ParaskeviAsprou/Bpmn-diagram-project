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
import static org.springframework.http.ResponseEntity.badRequest;
import static org.springframework.http.ResponseEntity.ok;
import static org.springframework.http.ResponseEntity.status;

@RestController
@RequestMapping("/api/v1/file/")
public class FolderController {

    @Autowired
    private FolderService folderService;


    @PostMapping("create-folder")
    public ResponseEntity<Folder> createFolder(@RequestBody CreateFolderRequest request, Principal principal) {
        String createdBy = principal != null ? principal.getName() : "anonymous";
        Folder newFolder;
        if (request.getParentFolderId() != null) {
            newFolder = folderService.createSubFolder(
                    request.getParentFolderId(),
                    request.getFolderName(),
                    request.getDescription(),
                    createdBy
            );
        } else {
            newFolder = folderService.createRootFolder(
                    request.getFolderName(),
                    request.getDescription(),
                    createdBy
            );
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("USERNAME: " + auth.getName());
        System.out.println("AUTHORITIES: " + auth.getAuthorities());
        return new ResponseEntity<>(newFolder, HttpStatus.OK);
    }

    // FIXED: Uncommented and fixed the getRootFolders endpoint
    @GetMapping("all/folders")
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

            List<File> files = folderService.getFilesInFolder(folderId);
            files.forEach(this::prepareFileForResponse);

            return ok(files);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve files: " + e.getMessage()));
        }
    }
    @GetMapping("/folders/{folderId}/breadcrumb")
    @PreAuthorize("hasRole('VIEWER') or hasRole('MODELER') or hasRole('ADMIN')")
    public ResponseEntity<List<FolderService.FolderBreadcrumb>> getFolderBreadcrumb(@PathVariable Long folderId) {
        try {
            List<FolderService.FolderBreadcrumb> breadcrumbs = folderService.getFolderBreadcrumb(folderId);
            return ok(breadcrumbs);
        } catch (Exception e) {
            return status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    private void prepareFileForResponse(File file) {
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

    public static class CreateFolderRequest {
        private String folderName;
        private String description;
        private Long parentFolderId;
        private String createdBy; // This would be populated from the Angular side

        // Getters and Setters
        public String getFolderName() { return folderName; }
        public void setFolderName(String folderName) { this.folderName = folderName; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Long getParentFolderId() { return parentFolderId; }
        public void setParentFolderId(Long parentFolderId) { this.parentFolderId = parentFolderId; }
        public String getCreatedBy() { return createdBy; }
        public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    }
}