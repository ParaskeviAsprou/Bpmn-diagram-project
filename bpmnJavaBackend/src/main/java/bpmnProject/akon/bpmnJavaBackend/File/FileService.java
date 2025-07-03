package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class FileService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final FileVersionRepository fileVersionRepository;

    @Autowired
    public FileService(FileRepository fileRepository, FolderRepository folderRepository,
                       FileVersionRepository fileVersionRepository) {
        this.fileRepository = fileRepository;
        this.folderRepository = folderRepository;
        this.fileVersionRepository = fileVersionRepository;
    }

    // =================== BPMN DIAGRAM OPERATIONS ===================

    /**
     * Save BPMN diagram compatible with Angular frontend
     */
    @Transactional
    public File saveBpmnDiagram(String fileName, String xml, String customProperties,
                                String elementColors, Long folderId, String createdBy,
                                boolean overwrite) {
        try {
            System.out.println("Starting saveBpmnDiagram with fileName: " + fileName);

            // Validate input
            if (fileName == null || fileName.trim().isEmpty()) {
                throw new IllegalArgumentException("File name is required");
            }
            if (xml == null || xml.trim().isEmpty()) {
                throw new IllegalArgumentException("XML content is required");
            }

            fileName = fileName.trim();

            // Check if file exists and handle overwrite
            Optional<File> existingFileOpt = findExistingFile(fileName, folderId);
            if (existingFileOpt.isPresent() && !overwrite) {
                throw new IllegalStateException("File already exists: " + fileName);
            }

            File file;
            if (existingFileOpt.isPresent() && overwrite) {
                // Update existing file
                file = existingFileOpt.get();
                // Create version before overwrite
                createVersion(file);

                // Update file content
                file.setXml(xml);
                file.setFileData(xml);
                file.setFileSize((long) xml.getBytes().length);
                file.setCustomProperties(customProperties != null ? customProperties : "{}");
                file.setElementColors(elementColors != null ? elementColors : "{}");
                file.setUpdatedBy(createdBy);
                file.setUpdatedTime(LocalDateTime.now());

                // Increment current version
                Integer newVersion = (file.getCurrentVersion() != null ? file.getCurrentVersion() : 0) + 1;
                file.setCurrentVersion(newVersion);
            } else {
                // Create new file
                file = createNewFile(fileName, xml, customProperties, elementColors, folderId, createdBy);
            }

            File savedFile = fileRepository.save(file);
            System.out.println("File saved with ID: " + savedFile.getId());

            // Create file version record
            createFileVersion(savedFile, xml, customProperties, elementColors, createdBy);

            return savedFile;

        } catch (Exception e) {
            System.err.println("Error in FileService.saveBpmnDiagram: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to save BPMN diagram: " + e.getMessage(), e);
        }
    }

    /**
     * Update existing BPMN file content - Used by PUT endpoint
     */
    @Transactional
    public File updateBpmnFileContent(Long fileId, String xml, String customProperties,
                                      String elementColors, String updatedBy) {
        try {
            System.out.println("Updating BPMN file content for file ID: " + fileId);

            File existingFile = fileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found with ID: " + fileId));

            // Create version before update
            createVersion(existingFile);

            // Update file content
            existingFile.setXml(xml);
            existingFile.setFileData(xml);
            existingFile.setFileSize((long) xml.getBytes().length);
            existingFile.setCustomProperties(customProperties != null ? customProperties : "{}");
            existingFile.setElementColors(elementColors != null ? elementColors : "{}");
            existingFile.setUpdatedBy(updatedBy);
            existingFile.setUpdatedTime(LocalDateTime.now());

            // Increment current version
            Integer newVersion = (existingFile.getCurrentVersion() != null ? existingFile.getCurrentVersion() : 0) + 1;
            existingFile.setCurrentVersion(newVersion);

            File savedFile = fileRepository.save(existingFile);

            // Create new file version record
            createFileVersion(savedFile, xml, customProperties, elementColors, updatedBy);

            System.out.println("File updated successfully with ID: " + savedFile.getId());
            return savedFile;

        } catch (Exception e) {
            System.err.println("Error updating BPMN file content: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update BPMN file content: " + e.getMessage(), e);
        }
    }

    private void createFileVersion(File originalFile, String xml, String customProperties,
                                   String elementColors, String createdBy) {
        try {
            FileVersion version = new FileVersion();
            version.setOriginalFileId(originalFile.getId());
            version.setVersionNumber(originalFile.getCurrentVersion());
            version.setFileName(originalFile.getFileName());
            version.setFileType(originalFile.getFileType());
            version.setFileData(xml);
            version.setXml(xml);
            version.setFileSize(xml.length());
            version.setCustomProperties(customProperties != null ? customProperties : "{}");
            version.setElementColors(elementColors != null ? elementColors : "{}");
            version.setCreatedTime(LocalDateTime.now());
            version.setCreatedBy(createdBy);
            version.setUpdatedBy(createdBy);
            version.setVersionNotes("Version " + originalFile.getCurrentVersion());
            version.setIsCurrent(true);

            // Mark all previous versions as not current
            if (originalFile.getCurrentVersion() > 1) {
                fileVersionRepository.markAllVersionsAsNotCurrent(originalFile.getId());
            }

            fileVersionRepository.save(version);
            System.out.println("Created version for file ID: " + originalFile.getId());
        } catch (Exception e) {
            System.err.println("Error creating file version: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void createVersion(File originalFile) {
        try {
            FileVersion version = new FileVersion();
            version.setOriginalFileId(originalFile.getId());
            version.setVersionNumber(originalFile.getCurrentVersion());
            version.setFileName(originalFile.getFileName());
            version.setFileType(originalFile.getFileType());
            version.setFileData(originalFile.getXml());
            version.setXml(originalFile.getXml());
            version.setFileSize(originalFile.getFileSize() != null ? originalFile.getFileSize().intValue() : 0);
            version.setCustomProperties(originalFile.getCustomProperties());
            version.setElementColors(originalFile.getElementColors());
            version.setCreatedTime(originalFile.getUpdatedTime());
            version.setCreatedBy(originalFile.getUpdatedBy());
            version.setUpdatedBy(originalFile.getUpdatedBy());
            version.setVersionNotes("Previous version");
            version.setIsCurrent(false);

            fileVersionRepository.save(version);
            System.out.println("Created backup version for file ID: " + originalFile.getId());
        } catch (Exception e) {
            System.err.println("Error creating file version: " + e.getMessage());
        }
    }

    private Optional<File> findExistingFile(String fileName, Long folderId) {
        try {
            if (folderId == null) {
                return fileRepository.findByFileNameAndFolderIsNull(fileName);
            } else {
                return fileRepository.findByFileNameAndFolderId(fileName, folderId);
            }
        } catch (Exception e) {
            System.err.println("Error finding existing file: " + e.getMessage());
            return Optional.empty();
        }
    }

    private File createNewFile(String fileName, String xml, String customProperties,
                               String elementColors, Long folderId, String createdBy) {
        File file = new File();
        file.setFileName(fileName);
        file.setFileType("bpmn");
        file.setXml(xml);
        file.setFileData(xml);
        file.setFileSize((long) xml.getBytes().length);
        file.setCustomProperties(customProperties != null ? customProperties : "{}");
        file.setElementColors(elementColors != null ? elementColors : "{}");
        file.setCreatedBy(createdBy);
        file.setUpdatedBy(createdBy);
        file.setUploadTime(LocalDateTime.now());
        file.setUpdatedTime(LocalDateTime.now());
        file.setCurrentVersion(1);

        // Set folder ID
        file.setFolderId(folderId);

        // Optionally set folder relationship if needed
        if (folderId != null) {
            Optional<Folder> folderOpt = folderRepository.findById(folderId);
            if (folderOpt.isPresent()) {
                file.setFolder(folderOpt.get());
            }
        }

        return file;
    }

    // =================== FILE OPERATIONS ===================

    @Transactional
    public File uploadFileToFolder(MultipartFile multipartFile, Long folderId,
                                   String description, String tags, String createdBy) throws IOException {
        try {
            System.out.println("=== UPLOAD FILE TO FOLDER DEBUG ===");
            System.out.println("File: " + multipartFile.getOriginalFilename());
            System.out.println("Size: " + multipartFile.getSize());
            System.out.println("FolderId: " + folderId);
            System.out.println("CreatedBy: " + createdBy);

            if (multipartFile.isEmpty()) {
                throw new RuntimeException("File is empty");
            }

            // Check if folder exists
            Folder folder = null;
            if (folderId != null) {
                folder = folderRepository.findById(folderId)
                        .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));
                System.out.println("Found folder: " + folder.getFolderName());
            }

            String fileName = multipartFile.getOriginalFilename();
            if (fileName == null || fileName.trim().isEmpty()) {
                fileName = "uploaded_file_" + System.currentTimeMillis();
            }

            System.out.println("Checking if file exists: " + fileName);
            if (fileExistsInFolder(fileName, folderId)) {
                throw new RuntimeException("File with name '" + fileName + "' already exists in this location");
            }

            // Read file content
            byte[] fileBytes = multipartFile.getBytes();
            String fileContent = new String(fileBytes);

            // Create file entity
            File file = new File();
            file.setFileName(fileName);
            file.setFileType(multipartFile.getContentType());
            file.setFileData(fileContent);
            file.setFileSize(multipartFile.getSize());
            file.setFolder(folder);
            file.setFolderId(folderId);
            file.setDescription(description);
            file.setTags(tags);
            file.setCreatedBy(createdBy);
            file.setUpdatedBy(createdBy);
            file.setUploadTime(LocalDateTime.now());
            file.setUpdatedTime(LocalDateTime.now());
            file.setCurrentVersion(1);
            file.setCustomProperties("{}");
            file.setElementColors("{}");

            // If it's a BPMN file, also set XML field
            if (isBpmnFile(fileName, multipartFile.getContentType())) {
                file.setXml(fileContent);
                System.out.println("Set XML content for BPMN file");
            }

            System.out.println("Saving file to database...");
            File savedFile = fileRepository.save(file);
            System.out.println("File saved with ID: " + savedFile.getId());

            // Update folder statistics
            if (folderId != null) {
                updateFolderStatistics(folderId);
            }

            return savedFile;

        } catch (Exception e) {
            System.err.println("Error in uploadFileToFolder: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public File updateFile(File file) {
        try {
            if (file.getId() == null) {
                throw new RuntimeException("File ID is required for update");
            }

            File existingFile = findFileById(file.getId());

            existingFile.setFileName(file.getFileName());
            existingFile.setFileType(file.getFileType());
            existingFile.setDescription(file.getDescription());
            existingFile.setTags(file.getTags());

            if (file.getFileData() != null) {
                existingFile.setFileData(file.getFileData());
                existingFile.setFileSize((long) file.getFileData().length());
                if (isBpmnFile(existingFile.getFileName(), existingFile.getFileType())) {
                    existingFile.setXml(file.getFileData());
                }
            }

            existingFile.setUpdatedTime(LocalDateTime.now());
            File updatedFile = fileRepository.save(existingFile);

            if (existingFile.getFolder() != null) {
                updateFolderStatistics(existingFile.getFolder().getId());
            }

            return updatedFile;

        } catch (Exception e) {
            throw new RuntimeException("Failed to update file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteByFile(Long id) {
        if (!fileRepository.existsById(id)) {
            throw new RuntimeException("File not found with id: " + id);
        }
        fileRepository.deleteById(id);
    }

    // =================== QUERY OPERATIONS ===================

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
    public Optional<File> getFileById(Long id) {
        return fileRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public File findFileByFilename(String filename) {
        return fileRepository.findByFileName(filename)
                .orElseThrow(() -> new RuntimeException("File not found with filename: " + filename));
    }

    @Transactional(readOnly = true)
    public List<File> getFilesInFolder(Long folderId) {
        if (folderId == null) {
            return fileRepository.findByFolderIsNullOrderByUploadTimeDesc();
        }
        return fileRepository.findByFolderIdOrderByUploadTimeDesc(folderId);
    }

    @Transactional(readOnly = true)
    public List<FileVersion> getFileVersions(Long fileId) {
        return fileVersionRepository.findByOriginalFileIdOrderByVersionNumberDesc(fileId);
    }

    @Transactional(readOnly = true)
    public Optional<FileVersion> getSpecificVersion(Long fileId, Integer versionNumber) {
        return fileVersionRepository.findByOriginalFileIdAndVersionNumber(fileId, versionNumber);
    }

    @Transactional(readOnly = true)
    public boolean fileExistsInFolder(String fileName, Long folderId) {
        try {
            if (folderId == null) {
                return fileRepository.findByFileNameAndFolderIsNull(fileName).isPresent();
            } else {
                return fileRepository.findByFileNameAndFolderId(fileName, folderId).isPresent();
            }
        } catch (Exception e) {
            System.err.println("Error checking file existence: " + e.getMessage());
            return false;
        }
    }

    // =================== UTILITY METHODS ===================

    private boolean isBpmnFile(String fileName, String fileType) {
        if (fileName == null) return false;
        String lowerName = fileName.toLowerCase();
        return lowerName.endsWith(".bpmn") || lowerName.endsWith(".xml") ||
                (fileType != null && fileType.contains("xml"));
    }

    @Transactional
    private void updateFolderStatistics(Long folderId) {
        try {
            if (folderId == null) return;
            Optional<Folder> folderOpt = folderRepository.findById(folderId);
            if (folderOpt.isPresent()) {
                Folder folder = folderOpt.get();
                folder.setUpdatedTime(LocalDateTime.now());
                folderRepository.save(folder);
            }
        } catch (Exception e) {
            System.err.println("Error updating folder statistics: " + e.getMessage());
        }
    }

    // Legacy method for compatibility
    public File uploadFile(File file) {
        try {
            file.setUploadTime(LocalDateTime.now());

            if (file.getData() == null || file.getData().length == 0) {
                throw new RuntimeException("File data is empty");
            }

            if (file.getFileName() == null || file.getFileName().trim().isEmpty()) {
                file.setFileName("unnamed_file_" + System.currentTimeMillis());
            }

            if (file.getFileSize() == null) {
                file.setFileSize((long) file.getData().length);
            }

            File savedFile = fileRepository.save(file);
            System.out.println("File saved to database with ID: " + savedFile.getId());

            return savedFile;

        } catch (Exception e) {
            System.err.println("Error uploading file: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to upload file", e);
        }
    }
}