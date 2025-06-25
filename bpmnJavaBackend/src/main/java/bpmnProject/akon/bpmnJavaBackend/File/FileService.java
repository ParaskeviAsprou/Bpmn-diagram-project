package bpmnProject.akon.bpmnJavaBackend.File;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class FileService {

    private final FileRepository fileRepo;
    private final BpmnPdfService bpmnPdfService;

    @Autowired
    public FileService(FileRepository fileRepo, BpmnPdfService bpmnPdfService) {
        this.fileRepo = fileRepo;
        this.bpmnPdfService = bpmnPdfService;
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
            File savedFile = fileRepo.save(file);
            System.out.println("File saved to database with ID: " + savedFile.getId());

            return savedFile;

        } catch (Exception e) {
            System.err.println("Error uploading file: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    /**
     * Get all files from database
     */
    @Transactional(readOnly = true)
    public List<File> getAllFiles() {
        try {
            List<File> files = fileRepo.findAll();
            System.out.println("Retrieved " + files.size() + " files from database");
            return files;
        } catch (Exception e) {
            System.err.println("Error retrieving files: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to retrieve files", e);
        }
    }

    /**
     * Find file by filename
     */
    @Transactional(readOnly = true)
    public File findFileByFilename(String filename) {
        try {
            return fileRepo.findByFileName(filename)
                    .orElseThrow(() -> new RuntimeException("File with filename '" + filename + "' not found"));
        } catch (Exception e) {
            System.err.println("Error finding file by filename: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Find file by ID
     */
    @Transactional(readOnly = true)
    public File findFileById(Long id) {
        try {
            return fileRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("File with ID " + id + " not found"));
        } catch (Exception e) {
            System.err.println("Error finding file by ID: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Delete file by ID
     */
    public void deleteByFile(Long id) {
        try {
            if (!fileRepo.existsById(id)) {
                throw new RuntimeException("File with ID " + id + " not found");
            }
            fileRepo.deleteById(id);
            System.out.println("File with ID " + id + " deleted successfully");
        } catch (Exception e) {
            System.err.println("Error deleting file: " + e.getMessage());
            throw new RuntimeException("Failed to delete file", e);
        }
    }

    /**
     * Update file
     */
    public File updateFile(File file) {
        try {
            if (file.getId() == null) {
                throw new RuntimeException("File ID is required for update");
            }

            // Check if file exists
            File existingFile = findFileById(file.getId());

            // Update fields
            existingFile.setFileName(file.getFileName());
            existingFile.setFileType(file.getFileType());

            if (file.getData() != null) {
                existingFile.setData(file.getData());
                existingFile.setFileSize((long) file.getData().length);
            }

            return fileRepo.save(existingFile);

        } catch (Exception e) {
            System.err.println("Error updating file: " + e.getMessage());
            throw new RuntimeException("Failed to update file", e);
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
        return fileRepo.findByFileName(filename).isPresent();
    }

    /**
     * Get file statistics
     */
    @Transactional(readOnly = true)
    public FileStats getFileStats() {
        try {
            List<File> allFiles = fileRepo.findAll();

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
}