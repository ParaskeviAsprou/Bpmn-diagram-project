package bpmnProject.akon.bpmnJavaBackend.File;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;

    @Autowired
    public FolderService(FolderRepository folderRepository, FileRepository fileRepository) {
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
    }

    // =================== SIMPLIFIED FOLDER OPERATIONS ===================

    /**
     * Create simple folder (no parent-child relationships)
     */
    @Transactional
    public Folder createSimpleFolder(String folderName, String description, String createdBy) {
        // Check if folder with same name already exists
        if (folderRepository.existsByFolderName(folderName)) {
            throw new RuntimeException("Folder with name '" + folderName + "' already exists");
        }

        Folder folder = new Folder();
        folder.setFolderName(folderName);
        folder.setDescription(description);
        folder.setCreatedBy(createdBy);
        folder.setCreatedTime(LocalDateTime.now());
        folder.setUpdatedTime(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    /**
     * Get all folders (simplified - no hierarchy)
     */
    @Transactional(readOnly = true)
    public List<Folder> getAllSimpleFolders() {
        return folderRepository.findAllByOrderByFolderNameAsc();
    }

    /**
     * Get folder by id
     */
    @Transactional(readOnly = true)
    public Optional<Folder> getFolderById(Long folderId) {
        return folderRepository.findById(folderId);
    }

    /**
     * Get files in folder
     */
    @Transactional(readOnly = true)
    public List<File> getFilesInFolder(Long folderId) {
        if (folderId == null) {
            return fileRepository.findByFolderIsNullOrderByUploadTimeDesc();
        }
        return fileRepository.findByFolderIdOrderByUploadTimeDesc(folderId);
    }

    /**
     * Rename folder
     */
    @Transactional
    public Folder renameFolder(Long folderId, String newName, String updatedBy) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        // Check if folder with new name already exists
        if (folderRepository.existsByFolderName(newName)) {
            throw new RuntimeException("Folder with name '" + newName + "' already exists");
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
            throw new RuntimeException("Cannot delete folder: it contains " + filesInFolder.size() + " files. Please move or delete the files first.");
        }

        folderRepository.delete(folder);
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
        file.setFolderId(folderId);
        file.setUpdatedTime(LocalDateTime.now());

        return fileRepository.save(file);
    }

    /**
     * Update folder description
     */
    @Transactional
    public Folder updateFolderDescription(Long folderId, String description, String updatedBy) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        folder.setDescription(description);
        folder.setUpdatedTime(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    /**
     * Get folder statistics
     */
    @Transactional(readOnly = true)
    public FolderStats getFolderStats(Long folderId) {
        List<File> files = getFilesInFolder(folderId);

        long totalSize = files.stream()
                .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0L)
                .sum();

        return new FolderStats(files.size(), totalSize);
    }

    // =================== UTILITY METHODS ===================

    /**
     * Format file size
     */
    public String formatFileSize(long bytes) {
        if (bytes == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }

    /**
     * Format date
     */
    public String formatDate(LocalDateTime dateTime) {
        if (dateTime == null) return "N/A";
        return dateTime.toString();
    }

    // =================== INNER CLASSES ===================

    @Getter
    public static class FolderStats {
        private final int fileCount;
        private final long totalSize;

        public FolderStats(int fileCount, long totalSize) {
            this.fileCount = fileCount;
            this.totalSize = totalSize;
        }

    }
}