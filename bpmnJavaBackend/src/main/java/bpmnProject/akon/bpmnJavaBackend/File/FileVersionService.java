package bpmnProject.akon.bpmnJavaBackend.File;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileVersionService {

    private final FileVersionRepository fileVersionRepository;
    private final FileRepository fileRepository;

    /**
     * Create a new version of a file
     */
    @Transactional
    public FileVersion createNewVersion(Long fileId, byte[] newData, String versionNotes, String createdBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        // Create version from current file data
        FileVersion newVersion = FileVersion.builder()
                .originalFile(originalFile)
                .versionNumber(originalFile.getCurrentVersion())
                .fileName(originalFile.getFileName())
                .fileType(originalFile.getFileType())
                .data(originalFile.getData()) // Save current data as version
                .fileSize(originalFile.getFileSize())
                .createdTime(LocalDateTime.now())
                .createdBy(createdBy)
                .versionNotes(versionNotes != null ? versionNotes : "Version " + originalFile.getCurrentVersion())
                .isCurrent(false)
                .build();

        // Save the version
        FileVersion savedVersion = fileVersionRepository.save(newVersion);

        // Update the original file with new data
        originalFile.setData(newData);
        originalFile.setCurrentVersion(originalFile.getCurrentVersion() + 1);
        originalFile.setUpdatedTime(LocalDateTime.now());
        originalFile.setUpdatedBy(createdBy);
        fileRepository.save(originalFile);

        return savedVersion;
    }

    /**
     * Save current file as new version and create new file (branch)
     */
    @Transactional
    public File createNewFileFromVersion(Long fileId, byte[] newData, String newFileName,
                                         String versionNotes, String createdBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        // Create version from current file data
        createNewVersion(fileId, originalFile.getData(),
                "Branched to create: " + newFileName, createdBy);

        // Create new file with new data
        File newFile = new File();
        newFile.setFileName(newFileName);
        newFile.setFileType(originalFile.getFileType());
        newFile.setData(newData);
        newFile.setFolder(originalFile.getFolder());
        newFile.setDescription("Branched from: " + originalFile.getFileName());
        newFile.setTags(originalFile.getTags());
        newFile.setCreatedBy(createdBy);
        newFile.setIsPublic(originalFile.getIsPublic());
        newFile.setIsTemplate(false);
        newFile.setCurrentVersion(1);
        newFile.setUploadTime(LocalDateTime.now());

        return fileRepository.save(newFile);
    }

    /**
     * Get all versions of a file
     */
    @Transactional(readOnly = true)
    public List<FileVersion> getFileVersions(Long fileId) {
        return fileVersionRepository.findByOriginalFileIdOrderByVersionNumberDesc(fileId);
    }

    /**
     * Get specific version of a file
     */
    @Transactional(readOnly = true)
    public Optional<FileVersion> getFileVersion(Long fileId, Integer versionNumber) {
        return fileVersionRepository.findByOriginalFileIdAndVersionNumber(fileId, versionNumber);
    }

    /**
     * Restore a specific version (make it current)
     */
    @Transactional
    public File restoreVersion(Long fileId, Integer versionNumber, String restoredBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        FileVersion versionToRestore = fileVersionRepository
                .findByOriginalFileIdAndVersionNumber(fileId, versionNumber)
                .orElseThrow(() -> new RuntimeException("Version not found: " + versionNumber));

        // Create version from current data before restoring
        createNewVersion(fileId, originalFile.getData(),
                "Before restoring version " + versionNumber, restoredBy);

        // Restore the version data to current file
        originalFile.setData(versionToRestore.getData());
        originalFile.setUpdatedTime(LocalDateTime.now());
        originalFile.setUpdatedBy(restoredBy);

        return fileRepository.save(originalFile);
    }

    /**
     * Delete a specific version
     */
    @Transactional
    public void deleteVersion(Long versionId) {
        FileVersion version = fileVersionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found with id: " + versionId));

        if (version.getIsCurrent()) {
            throw new RuntimeException("Cannot delete current version");
        }

        fileVersionRepository.delete(version);
    }

    /**
     * Get version count for a file
     */
    @Transactional(readOnly = true)
    public Long getVersionCount(Long fileId) {
        return fileVersionRepository.countVersionsByFileId(fileId);
    }

    /**
     * Compare two versions
     */
    @Transactional(readOnly = true)
    public VersionComparison compareVersions(Long fileId, Integer version1, Integer version2) {
        FileVersion v1 = fileVersionRepository
                .findByOriginalFileIdAndVersionNumber(fileId, version1)
                .orElseThrow(() -> new RuntimeException("Version " + version1 + " not found"));

        FileVersion v2 = fileVersionRepository
                .findByOriginalFileIdAndVersionNumber(fileId, version2)
                .orElseThrow(() -> new RuntimeException("Version " + version2 + " not found"));

        return VersionComparison.builder()
                .version1(v1)
                .version2(v2)
                .sizeDifference(v2.getFileSize() - v1.getFileSize())
                .timeDifference(java.time.Duration.between(v1.getCreatedTime(), v2.getCreatedTime()))
                .build();
    }

    /**
     * Get version statistics
     */
    @Transactional(readOnly = true)
    public VersionStatistics getVersionStatistics(Long fileId) {
        List<FileVersion> versions = getFileVersions(fileId);
        File currentFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        long totalVersionSize = versions.stream()
                .mapToLong(v -> v.getFileSize() != null ? v.getFileSize() : 0L)
                .sum();

        return VersionStatistics.builder()
                .totalVersions(versions.size() + 1) // +1 for current
                .currentVersion(currentFile.getCurrentVersion())
                .totalVersionSize(totalVersionSize + currentFile.getFileSize())
                .averageVersionSize((totalVersionSize + currentFile.getFileSize()) / (versions.size() + 1))
                .oldestVersion(versions.isEmpty() ? currentFile.getUploadTime() :
                        versions.get(versions.size() - 1).getCreatedTime())
                .newestVersion(currentFile.getUpdatedTime())
                .build();
    }

    // Inner classes for response objects
    @lombok.Data
    @lombok.Builder
    public static class VersionComparison {
        private FileVersion version1;
        private FileVersion version2;
        private Long sizeDifference;
        private java.time.Duration timeDifference;
    }

    @lombok.Data
    @lombok.Builder
    public static class VersionStatistics {
        private Integer totalVersions;
        private Integer currentVersion;
        private Long totalVersionSize;
        private Long averageVersionSize;
        private LocalDateTime oldestVersion;
        private LocalDateTime newestVersion;
    }
}