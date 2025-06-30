package bpmnProject.akon.bpmnJavaBackend.File;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;

    /**
     * Create root folder
     */
    @Transactional
    public Folder createRootFolder(String folderName, String description, String createdBy) {
        // Check if root folder with same name exists
        if (folderRepository.existsByFolderNameAndParentFolderIsNull(folderName)) {
            throw new RuntimeException("Root folder with name '" + folderName + "' already exists");
        }

        Folder rootFolder = Folder.builder()
                .folderName(folderName)
                .description(description)
                .createdBy(createdBy)
                .createdTime(LocalDateTime.now())
                .isRoot(true)
                .parentFolder(null)
                .build();

        return folderRepository.save(rootFolder);
    }

    /**
     * Create subfolder
     */
    @Transactional
    public Folder createSubFolder(Long parentFolderId, String folderName, String description, String createdBy) {
        Folder parentFolder = folderRepository.findById(parentFolderId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found with id: " + parentFolderId));

        // Check if subfolder with same name exists in parent
        if (folderRepository.existsByFolderNameAndParentFolder(folderName, parentFolder)) {
            throw new RuntimeException("Folder with name '" + folderName + "' already exists in this location");
        }

        Folder subFolder = Folder.builder()
                .folderName(folderName)
                .description(description)
                .createdBy(createdBy)
                .createdTime(LocalDateTime.now())
                .isRoot(false)
                .parentFolder(parentFolder)
                .build();

        Folder savedFolder = folderRepository.save(subFolder);

        // Update parent folder's updated time
        parentFolder.setUpdatedTime(LocalDateTime.now());
        folderRepository.save(parentFolder);

        return savedFolder;
    }

    /**
     * Get all root folders
     */
    @Transactional(readOnly = true)
    public List<Folder> getRootFolders() {
        return folderRepository.findByParentFolderIsNullOrderByFolderNameAsc();
    }

    /**
     * Get subfolders of a folder
     */
    @Transactional(readOnly = true)
    public List<Folder> getSubFolders(Long folderId) {
        return folderRepository.findByParentFolderIdOrderByFolderNameAsc(folderId);
    }

    /**
     * Get folder by id with statistics
     */
    @Transactional(readOnly = true)
    public Optional<Folder> getFolderWithStats(Long folderId) {
        Optional<Folder> folderOpt = folderRepository.findById(folderId);

        if (folderOpt.isPresent()) {
            Folder folder = folderOpt.get();
            // The statistics are computed in the entity getters
            return Optional.of(folder);
        }

        return Optional.empty();
    }

    /**
     * Move folder to new parent
     */
    @Transactional
    public Folder moveFolder(Long folderId, Long newParentFolderId, String updatedBy) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        Folder newParentFolder = null;
        if (newParentFolderId != null) {
            newParentFolder = folderRepository.findById(newParentFolderId)
                    .orElseThrow(() -> new RuntimeException("New parent folder not found with id: " + newParentFolderId));

            // Check for circular reference
            if (newParentFolder.isSubFolderOf(folder)) {
                throw new RuntimeException("Cannot move folder: would create circular reference");
            }

            // Check if folder with same name exists in new parent
            if (folderRepository.existsByFolderNameAndParentFolder(folder.getFolderName(), newParentFolder)) {
                throw new RuntimeException("Folder with name '" + folder.getFolderName() +
                        "' already exists in destination folder");
            }
        } else {
            // Moving to root
            if (folderRepository.existsByFolderNameAndParentFolderIsNull(folder.getFolderName())) {
                throw new RuntimeException("Root folder with name '" + folder.getFolderName() + "' already exists");
            }
        }

        folder.setParentFolder(newParentFolder);
        folder.setIsRoot(newParentFolder == null);
        folder.setUpdatedTime(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    /**
     * Rename folder
     */
    @Transactional
    public Folder renameFolder(Long folderId, String newName, String updatedBy) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        // Check if folder with new name already exists in same parent
        if (folder.getParentFolder() != null) {
            if (folderRepository.existsByFolderNameAndParentFolder(newName, folder.getParentFolder())) {
                throw new RuntimeException("Folder with name '" + newName + "' already exists in this location");
            }
        } else {
            if (folderRepository.existsByFolderNameAndParentFolderIsNull(newName)) {
                throw new RuntimeException("Root folder with name '" + newName + "' already exists");
            }
        }

        folder.setFolderName(newName);
        folder.setUpdatedTime(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    /**
     * Delete folder (must be empty)
     */
    @Transactional
    public void deleteFolder(Long folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        // Check if folder has files
        List<File> filesInFolder = fileRepository.findByFolderIdOrderByUploadTimeDesc(folderId);
        if (!filesInFolder.isEmpty()) {
            throw new RuntimeException("Cannot delete folder: it contains " + filesInFolder.size() + " files");
        }

        // Check if folder has subfolders
        List<Folder> subFolders = folderRepository.findByParentFolderIdOrderByFolderNameAsc(folderId);
        if (!subFolders.isEmpty()) {
            throw new RuntimeException("Cannot delete folder: it contains " + subFolders.size() + " subfolders");
        }

        folderRepository.delete(folder);
    }

    /**
     * Delete folder recursively (with all contents)
     */
    @Transactional
    public FolderDeletionResult deleteFolderRecursively(Long folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        FolderDeletionResult result = new FolderDeletionResult();
        deleteFolderRecursivelyInternal(folder, result);

        return result;
    }

    private void deleteFolderRecursivelyInternal(Folder folder, FolderDeletionResult result) {
        // Delete all files in folder
        List<File> files = fileRepository.findByFolderOrderByUploadTimeDesc(folder);
        for (File file : files) {
            fileRepository.delete(file);
            result.deletedFiles++;
        }

        // Recursively delete subfolders
        List<Folder> subFolders = folderRepository.findByParentFolderOrderByFolderNameAsc(folder);
        for (Folder subFolder : subFolders) {
            deleteFolderRecursivelyInternal(subFolder, result);
        }

        // Delete the folder itself
        folderRepository.delete(folder);
        result.deletedFolders++;
    }

    /**
     * Search folders
     */
    @Transactional(readOnly = true)
    public List<Folder> searchFolders(String searchTerm) {
        return folderRepository.searchByNameOrDescription(searchTerm);
    }

    /**
     * Get folder breadcrumb path
     */
    @Transactional(readOnly = true)
    public List<FolderBreadcrumb> getFolderBreadcrumb(Long folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        List<FolderBreadcrumb> breadcrumbs = new java.util.ArrayList<>();
        Folder current = folder;

        while (current != null) {
            breadcrumbs.add(0, FolderBreadcrumb.builder()
                    .id(current.getId())
                    .name(current.getFolderName())
                    .path(current.getFolderPath())
                    .build());
            current = current.getParentFolder();
        }

        return breadcrumbs;
    }

    /**
     * Get folder tree structure
     */
    @Transactional(readOnly = true)
    public List<FolderTreeNode> getFolderTree() {
        List<Folder> rootFolders = getRootFolders();
        return rootFolders.stream()
                .map(this::buildFolderTreeNode)
                .toList();
    }

    private FolderTreeNode buildFolderTreeNode(Folder folder) {
        List<Folder> subFolders = folderRepository.findByParentFolderOrderByFolderNameAsc(folder);
        List<FolderTreeNode> children = subFolders.stream()
                .map(this::buildFolderTreeNode)
                .toList();

        return FolderTreeNode.builder()
                .id(folder.getId())
                .name(folder.getFolderName())
                .path(folder.getFolderPath())
                .fileCount(folder.getFileCount())
                .subFolderCount(folder.getSubFolderCount())
                .children(children)
                .build();
    }

    /**
     * Move file to folder
     */
    @Transactional
    public File moveFileToFolder(Long fileId, Long folderId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));
        }

        file.setFolder(folder);
        file.setUpdatedTime(LocalDateTime.now());

        return fileRepository.save(file);
    }

    // Response classes
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class FolderDeletionResult {
        private int deletedFolders = 0;
        private int deletedFiles = 0;
    }

    @lombok.Data
    @lombok.Builder
    public static class FolderBreadcrumb {
        private Long id;
        private String name;
        private String path;
    }

    @lombok.Data
    @lombok.Builder
    public static class FolderTreeNode {
        private Long id;
        private String name;
        private String path;
        private Integer fileCount;
        private Integer subFolderCount;
        private List<FolderTreeNode> children;
    }
}