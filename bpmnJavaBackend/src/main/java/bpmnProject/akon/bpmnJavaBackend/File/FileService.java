package bpmnProject.akon.bpmnJavaBackend.File;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class FileService {

    private final FileRepository fileRepository;
    private final BpmnPdfService bpmnPdfService;
    private final FolderRepository folderRepository;
    private final FileVersionRepository fileVersionRepository;
    private final ElementAttachmentRepository elementAttachmentRepository;


    @Autowired
    public FileService(FileRepository fileRepo, FileRepository fileRepository, BpmnPdfService bpmnPdfService, FolderRepository folderRepository, FileVersionRepository fileVersionRepository, ElementAttachmentRepository elementAttachmentRepository) {
        this.fileRepository = fileRepository;
        this.bpmnPdfService = bpmnPdfService;
        this.folderRepository = folderRepository;
        this.fileVersionRepository = fileVersionRepository;
        this.elementAttachmentRepository = elementAttachmentRepository;
    }

    /**
     * Upload and save file to database
     */
    public File uploadFile(File file) {
        try {
            file.setUploadTime(LocalDateTime.now());

            // Validate file
            if (file.getData() == null || file.getData().length == 0) {
                throw new RuntimeException("File data is empty");
            }

            if (file.getFileName() == null || file.getFileName().trim().isEmpty()) {
                file.setFileName("unnamed_file_" + System.currentTimeMillis());
            }

            // Set file size if not set
            if (file.getFileSize() == null) {
                file.setFileSize((long) file.getData().length);
            }

            // Save to database
            File savedFile = fileRepository.save(file);
            System.out.println("File saved to database with ID: " + savedFile.getId());

            return savedFile;

        } catch (Exception e) {
            System.err.println("Error uploading file: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to upload file", e);
        }
    }
    /**
     * Convert BPMN file to PDF using BpmnPdfService
     */
    public byte[] convertBpmnToPdf(File file) {
        try {
            if (file == null || file.getData() == null) {
                throw new RuntimeException("File or file data is null");
            }

            return bpmnPdfService.convertBpmnToSvg(file);

        } catch (Exception e) {
            System.err.println("Error converting BPMN to PDF: " + e.getMessage());
            throw new RuntimeException("Failed to convert BPMN to PDF", e);
        }
    }

    /**
     * Check if file exists by filename
     */
    @Transactional(readOnly = true)
    public boolean fileExistsByName(String filename) {
        return fileRepository.findByFileName(filename).isPresent();
    }

    /**
     * Get file statistics
     */
    @Transactional(readOnly = true)
    public FileStats getFileStats() {
        try {
            List<File> allFiles = fileRepository.findAll();

            long totalFiles = allFiles.size();
            long totalSize = allFiles.stream()
                    .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0)
                    .sum();

            long bpmnFiles = allFiles.stream()
                    .filter(file -> file.getFileType() != null &&
                            (file.getFileType().contains("xml") ||
                                    file.getFileName().endsWith(".bpmn")))
                    .count();

            return new FileStats(totalFiles, totalSize, bpmnFiles);

        } catch (Exception e) {
            System.err.println("Error getting file stats: " + e.getMessage());
            return new FileStats(0, 0, 0);
        }
    }

    /**
     * File statistics class
     */
    public static class FileStats {
        private final long totalFiles;
        private final long totalSize;
        private final long bpmnFiles;

        public FileStats(long totalFiles, long totalSize, long bpmnFiles) {
            this.totalFiles = totalFiles;
            this.totalSize = totalSize;
            this.bpmnFiles = bpmnFiles;
        }

        public long getTotalFiles() { return totalFiles; }
        public long getTotalSize() { return totalSize; }
        public long getBpmnFiles() { return bpmnFiles; }
    }
    /**
     * Upload file to specific folder
     */
    @Transactional
    public File uploadFileToFolder(MultipartFile multipartFile, Long folderId,
                                   String description, String tags, String createdBy) throws IOException {
        try {
            // Validate file
            if (multipartFile.isEmpty()) {
                throw new RuntimeException("File is empty");
            }

            // Get folder if specified
            Folder folder = null;
            if (folderId != null) {
                folder = folderRepository.findById(folderId)
                        .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));
            }

            // Create file entity
            File file = new File();
            file.setFileName(multipartFile.getOriginalFilename());
            file.setFileType(multipartFile.getContentType());
            file.setData(multipartFile.getBytes());
            file.setFolder(folder);
            file.setDescription(description);
            file.setTags(tags);
            file.setCreatedBy(createdBy);
            file.setUploadTime(LocalDateTime.now());
            file.setUpdatedTime(LocalDateTime.now());
            file.setCurrentVersion(1);
            file.setIsPublic(false);
            file.setIsTemplate(false);

            File savedFile = fileRepository.save(file);
            System.out.println("File uploaded to folder: " + (folder != null ? folder.getFolderName() : "root"));

            return savedFile;

        } catch (Exception e) {
            System.err.println("Error uploading file to folder: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    /**
     * Get files in specific folder
     */
    @Transactional(readOnly = true)
    public List<File> getFilesInFolder(Long folderId) {
        if (folderId == null) {
            return fileRepository.findByFolderIsNullOrderByUploadTimeDesc();
        }
        return fileRepository.findByFolderIdOrderByUploadTimeDesc(folderId);
    }

    /**
     * Search files with optional folder filtering
     */
    @Transactional(readOnly = true)
    public List<File> searchFiles(String searchTerm, Long folderId) {
        if (folderId == null) {
            return fileRepository.searchFiles(searchTerm);
        }
        return fileRepository.searchFilesInFolder(searchTerm, folderId);
    }

    /**
     * Get template files
     */
    @Transactional(readOnly = true)
    public List<File> getTemplateFiles() {
        return fileRepository.findTemplateFiles();
    }

    /**
     * Get public files
     */
    @Transactional(readOnly = true)
    public List<File> getPublicFiles() {
        return fileRepository.findPublicFiles();
    }

    /**
     * Get recent files for user
     */
    @Transactional(readOnly = true)
    public List<File> getRecentFilesForUser(String username) {
        return fileRepository.findRecentFilesByUser(username);
    }

    /**
     * Get files by tag
     */
    @Transactional(readOnly = true)
    public List<File> getFilesByTag(String tag) {
        return fileRepository.findByTag(tag);
    }

    /**
     * Mark file as template
     */
    @Transactional
    public File markAsTemplate(Long fileId, boolean isTemplate, String updatedBy) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        file.setIsTemplate(isTemplate);
        file.setUpdatedBy(updatedBy);
        file.setUpdatedTime(LocalDateTime.now());

        return fileRepository.save(file);
    }

    /**
     * Update file metadata
     */
    @Transactional
    public File updateFileMetadata(Long fileId, String newName, String description,
                                   String tags, String updatedBy) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        if (newName != null && !newName.trim().isEmpty()) {
            file.setFileName(newName);
        }
        if (description != null) {
            file.setDescription(description);
        }
        if (tags != null) {
            file.setTags(tags);
        }

        file.setUpdatedBy(updatedBy);
        file.setUpdatedTime(LocalDateTime.now());

        return fileRepository.save(file);
    }

    /**
     * Duplicate file
     */
    @Transactional
    public File duplicateFile(Long fileId, String newFileName, Long targetFolderId, String createdBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        Folder targetFolder = null;
        if (targetFolderId != null) {
            targetFolder = folderRepository.findById(targetFolderId)
                    .orElseThrow(() -> new RuntimeException("Target folder not found"));
        }

        File duplicatedFile = new File();
        duplicatedFile.setFileName(newFileName);
        duplicatedFile.setFileType(originalFile.getFileType());
        duplicatedFile.setData(originalFile.getData());
        duplicatedFile.setFolder(targetFolder);
        duplicatedFile.setDescription("Copy of: " + originalFile.getDescription());
        duplicatedFile.setTags(originalFile.getTags());
        duplicatedFile.setCreatedBy(createdBy);
        duplicatedFile.setUploadTime(LocalDateTime.now());
        duplicatedFile.setUpdatedTime(LocalDateTime.now());
        duplicatedFile.setCurrentVersion(1);
        duplicatedFile.setIsPublic(false);
        duplicatedFile.setIsTemplate(false);

        return fileRepository.save(duplicatedFile);
    }

    /**
     * Get file statistics
     */
    @Transactional(readOnly = true)
    public FileStatistics getFileStatistics(String username) {
        List<File> allFiles = username != null ?
                fileRepository.findByCreatedByOrderByUploadTimeDesc(username) :
                fileRepository.findAll();

        long totalFiles = allFiles.size();
        long totalSize = allFiles.stream()
                .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0L)
                .sum();

        long bpmnFiles = allFiles.stream()
                .filter(File::isBpmnFile)
                .count();

        long templatesCount = allFiles.stream()
                .filter(file -> file.getIsTemplate() != null && file.getIsTemplate())
                .count();

        long publicFilesCount = allFiles.stream()
                .filter(file -> file.getIsPublic() != null && file.getIsPublic())
                .count();

        // Count total versions
        long totalVersions = fileVersionRepository.count();

        // Count total attachments
        long totalAttachments = elementAttachmentRepository.count();

        return FileStatistics.builder()
                .totalFiles(totalFiles)
                .totalSize(totalSize)
                .bpmnFiles(bpmnFiles)
                .templatesCount(templatesCount)
                .publicFilesCount(publicFilesCount)
                .totalVersions(totalVersions)
                .totalAttachments(totalAttachments)
                .averageFileSize(totalFiles > 0 ? totalSize / totalFiles : 0)
                .build();
    }

    /**
     * Get folder statistics
     */
    @Transactional(readOnly = true)
    public FolderStatistics getFolderStatistics(Long folderId) {
        List<File> files = getFilesInFolder(folderId);

        long fileCount = files.size();
        long totalSize = files.stream()
                .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0L)
                .sum();

        // Count subfolders
        long subFolderCount = folderId == null ?
                folderRepository.findByParentFolderIsNullOrderByFolderNameAsc().size() :
                folderRepository.findByParentFolderIdOrderByFolderNameAsc(folderId).size();

        return FolderStatistics.builder()
                .fileCount(fileCount)
                .subFolderCount(subFolderCount)
                .totalSize(totalSize)
                .lastModified(files.stream()
                        .map(File::getUpdatedTime)
                        .max(LocalDateTime::compareTo)
                        .orElse(null))
                .build();
    }

    /**
     * Clean up old versions (keep only last N versions)
     */
    @Transactional
    public void cleanupOldVersions(Long fileId, int versionsToKeep) {
        List<FileVersion> versions = fileVersionRepository.findByOriginalFileIdOrderByVersionNumberDesc(fileId);

        if (versions.size() > versionsToKeep) {
            List<FileVersion> versionsToDelete = versions.subList(versionsToKeep, versions.size());
            fileVersionRepository.deleteAll(versionsToDelete);
        }
    }

    /**
     * Export file with all its versions and attachments
     */
    @Transactional(readOnly = true)
    public FileExportData exportFileWithHistory(Long fileId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        List<FileVersion> versions = fileVersionRepository.findByOriginalFileIdOrderByVersionNumberDesc(fileId);
        List<ElementAttachment> attachments = elementAttachmentRepository.findByParentFileId(fileId);

        return FileExportData.builder()
                .file(file)
                .versions(versions)
                .attachments(attachments)
                .exportedAt(LocalDateTime.now())
                .build();
    }

    // Existing methods with enhanced functionality
    @Transactional(readOnly = true)
    public List<File> getAllFiles() {
        return fileRepository.findAll();
    }

    @Transactional(readOnly = true)
    public File findFileById(Long id) {
        return fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public File findFileByFilename(String filename) {
        return fileRepository.findByFileName(filename)
                .orElseThrow(() -> new RuntimeException("File not found with filename: " + filename));
    }

    @Transactional
    public void deleteByFile(Long id) {
        if (!fileRepository.existsById(id)) {
            throw new RuntimeException("File not found with id: " + id);
        }

        // Delete all versions first
        fileVersionRepository.deleteByOriginalFileId(id);

        // Delete all attachments
        elementAttachmentRepository.deleteByParentFileId(id);

        // Delete the file
        fileRepository.deleteById(id);
        System.out.println("File with ID " + id + " and all related data deleted successfully");
    }

    @Transactional
    public File updateFile(File file) {
        if (file.getId() == null) {
            throw new RuntimeException("File ID is required for update");
        }

        File existingFile = findFileById(file.getId());

        existingFile.setFileName(file.getFileName());
        existingFile.setFileType(file.getFileType());
        existingFile.setDescription(file.getDescription());
        existingFile.setTags(file.getTags());

        if (file.getData() != null) {
            existingFile.setData(file.getData());
        }

        existingFile.setUpdatedTime(LocalDateTime.now());

        return fileRepository.save(existingFile);
    }

    // Response classes
    @lombok.Data
    @lombok.Builder
    public static class FileStatistics {
        private Long totalFiles;
        private Long totalSize;
        private Long bpmnFiles;
        private Long templatesCount;
        private Long publicFilesCount;
        private Long totalVersions;
        private Long totalAttachments;
        private Long averageFileSize;
    }

    @lombok.Data
    @lombok.Builder
    public static class FolderStatistics {
        private Long fileCount;
        private Long subFolderCount;
        private Long totalSize;
        private LocalDateTime lastModified;
    }

    @lombok.Data
    @lombok.Builder
    public static class FileExportData {
        private File file;
        private List<FileVersion> versions;
        private List<ElementAttachment> attachments;
        private LocalDateTime exportedAt;
    }
}