package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FileVersionService {

    private final FileVersionRepository fileVersionRepository;
    private final FileRepository fileRepository;

    @Autowired
    public FileVersionService(FileVersionRepository fileVersionRepository, FileRepository fileRepository) {
        this.fileVersionRepository = fileVersionRepository;
        this.fileRepository = fileRepository;
    }

    /**
     * Create a new version of a file
     */
    @Transactional
    public FileVersion createNewVersion(Long fileId, String newData, String versionNotes, String createdBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        // Get next version number
        Integer currentMaxVersion = fileVersionRepository.findMaxVersionByOriginalFileId(fileId);
        Integer nextVersion = (currentMaxVersion != null ? currentMaxVersion : 0) + 1;

        // Create version from current file data
        FileVersion newVersion = new FileVersion();
        newVersion.setOriginalFileId(fileId);
        newVersion.setVersionNumber(nextVersion);
        newVersion.setFileName(originalFile.getFileName());
        newVersion.setFileType(originalFile.getFileType());
        newVersion.setFileData(originalFile.getFileData()); // Save current data as version
        newVersion.setXml(originalFile.getXml());
        newVersion.setFileSize(originalFile.getFileSize() != null ? originalFile.getFileSize().intValue() : 0);
        newVersion.setCreatedTime(LocalDateTime.now());
        newVersion.setCreatedBy(createdBy);
        newVersion.setUpdatedBy(createdBy);
        newVersion.setVersionNotes(versionNotes != null ? versionNotes : "Version " + nextVersion);
        newVersion.setIsCurrent(false); // This is a backup of previous version
        newVersion.setCustomProperties(originalFile.getCustomProperties());
        newVersion.setElementColors(originalFile.getElementColors());

        // Save the version
        FileVersion savedVersion = fileVersionRepository.save(newVersion);

        // Update the original file with new data
        originalFile.setFileData(newData);
        originalFile.setXml(newData); // Assuming it's XML/BPMN content
        originalFile.setFileSize((long) newData.length());
        originalFile.setCurrentVersion(nextVersion);
        originalFile.setUpdatedTime(LocalDateTime.now());
        originalFile.setUpdatedBy(createdBy);
        fileRepository.save(originalFile);

        return savedVersion;
    }

    /**
     * Create a new version with BPMN-specific data
     */
    @Transactional
    public FileVersion createBpmnVersion(Long fileId, String xml, String customProperties,
                                         String elementColors, String versionNotes, String createdBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        // Get next version number
        Integer currentMaxVersion = fileVersionRepository.findMaxVersionByOriginalFileId(fileId);
        Integer nextVersion = (currentMaxVersion != null ? currentMaxVersion : 0) + 1;

        // Mark all previous versions as not current
        fileVersionRepository.markAllVersionsAsNotCurrent(fileId);

        // Create new version
        FileVersion newVersion = new FileVersion();
        newVersion.setOriginalFileId(fileId);
        newVersion.setVersionNumber(nextVersion);
        newVersion.setFileName(originalFile.getFileName());
        newVersion.setFileType(originalFile.getFileType());
        newVersion.setFileData(xml);
        newVersion.setXml(xml);
        newVersion.setFileSize(xml.length());
        newVersion.setCreatedTime(LocalDateTime.now());
        newVersion.setCreatedBy(createdBy);
        newVersion.setUpdatedBy(createdBy);
        newVersion.setVersionNotes(versionNotes != null ? versionNotes : "Version " + nextVersion);
        newVersion.setIsCurrent(true); // This is the new current version
        newVersion.setCustomProperties(customProperties != null ? customProperties : "{}");
        newVersion.setElementColors(elementColors != null ? elementColors : "{}");

        return fileVersionRepository.save(newVersion);
    }

    /**
     * Save current file as new version and create new file (branch)
     */
    @Transactional
    public File createNewFileFromVersion(Long fileId, String newData, String newFileName,
                                         String versionNotes, String createdBy) {
        File originalFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        // Create version from current file data
        createNewVersion(fileId, originalFile.getFileData(),
                "Branched to create: " + newFileName, createdBy);

        // Create new file with new data
        File newFile = new File();
        newFile.setFileName(newFileName);
        newFile.setFileType(originalFile.getFileType());
        newFile.setFileData(newData);
        newFile.setXml(newData); // For BPMN files
        newFile.setFileSize((long) newData.length());
        newFile.setFolder(originalFile.getFolder());
        newFile.setFolderId(originalFile.getFolderId());
        newFile.setDescription("Branched from: " + originalFile.getFileName());
        newFile.setTags(originalFile.getTags());
        newFile.setCreatedBy(createdBy);
        newFile.setUpdatedBy(createdBy);
        newFile.setCurrentVersion(1);
        newFile.setUploadTime(LocalDateTime.now());
        newFile.setUpdatedTime(LocalDateTime.now());

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
     * Get all versions of a file (alternative method name for controller compatibility)
     */
    @Transactional(readOnly = true)
    public List<FileVersion> getFileVersionsByFileId(Long fileId) {
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
     * Get current version of a file
     */
    @Transactional(readOnly = true)
    public Optional<FileVersion> getCurrentVersion(Long fileId) {
        return fileVersionRepository.findCurrentVersionByFileId(fileId);
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
        createNewVersion(fileId, originalFile.getFileData(),
                "Before restoring version " + versionNumber, restoredBy);

        // Restore the version data to current file
        originalFile.setFileData(versionToRestore.getFileData());
        originalFile.setXml(versionToRestore.getXml());
        originalFile.setFileSize((long) versionToRestore.getFileSize());
        originalFile.setCustomProperties(versionToRestore.getCustomProperties());
        originalFile.setElementColors(versionToRestore.getElementColors());
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

        if (Boolean.TRUE.equals(version.getIsCurrent())) {
            throw new RuntimeException("Cannot delete current version");
        }

        fileVersionRepository.delete(version);
    }

    /**
     * Delete old versions (keep latest N versions)
     */
    @Transactional
    public int deleteOldVersions(Long fileId, int keepVersions) {
        List<FileVersion> allVersions = fileVersionRepository.findByOriginalFileIdOrderByVersionNumberDesc(fileId);

        if (allVersions.size() <= keepVersions) {
            return 0; // Nothing to delete
        }

        List<FileVersion> versionsToDelete = allVersions.subList(keepVersions, allVersions.size());
        int deletedCount = 0;

        for (FileVersion version : versionsToDelete) {
            if (!Boolean.TRUE.equals(version.getIsCurrent())) {
                fileVersionRepository.delete(version);
                deletedCount++;
            }
        }

        return deletedCount;
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

        VersionComparison comparison = new VersionComparison();
        comparison.setVersion1(v1);
        comparison.setVersion2(v2);
        comparison.setSizeDifference((long)(v2.getFileSize() - v1.getFileSize()));
        comparison.setTimeDifference(java.time.Duration.between(v1.getCreatedTime(), v2.getCreatedTime()));

        return comparison;
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

        VersionStatistics stats = new VersionStatistics();
        stats.setTotalVersions(versions.size() + 1); // +1 for current
        stats.setCurrentVersion(currentFile.getCurrentVersion());
        stats.setTotalVersionSize(totalVersionSize + (currentFile.getFileSize() != null ? currentFile.getFileSize() : 0L));
        stats.setAverageVersionSize((totalVersionSize + (currentFile.getFileSize() != null ? currentFile.getFileSize() : 0L)) / (versions.size() + 1));
        stats.setOldestVersion(versions.isEmpty() ? currentFile.getUploadTime() :
                versions.get(versions.size() - 1).getCreatedTime());
        stats.setNewestVersion(currentFile.getUpdatedTime());

        return stats;
    }

    /**
     * Get latest versions across multiple files
     */
    @Transactional(readOnly = true)
    public List<FileVersion> getLatestVersions(int limit) {
        return fileVersionRepository.findAllVersionsByDateDesc().stream()
                .limit(limit)
                .toList();
    }

    /**
     * Get total storage used by versions
     */
    @Transactional(readOnly = true)
    public Long getTotalVersionStorage() {
        return fileVersionRepository.getTotalVersionStorage();
    }

    // =================== INNER CLASSES ===================

    public static class VersionComparison {
        private FileVersion version1;
        private FileVersion version2;
        private Long sizeDifference;
        private java.time.Duration timeDifference;

        // Getters and Setters
        public FileVersion getVersion1() { return version1; }
        public void setVersion1(FileVersion version1) { this.version1 = version1; }

        public FileVersion getVersion2() { return version2; }
        public void setVersion2(FileVersion version2) { this.version2 = version2; }

        public Long getSizeDifference() { return sizeDifference; }
        public void setSizeDifference(Long sizeDifference) { this.sizeDifference = sizeDifference; }

        public java.time.Duration getTimeDifference() { return timeDifference; }
        public void setTimeDifference(java.time.Duration timeDifference) { this.timeDifference = timeDifference; }
    }

    public static class VersionStatistics {
        private Integer totalVersions;
        private Integer currentVersion;
        private Long totalVersionSize;
        private Long averageVersionSize;
        private LocalDateTime oldestVersion;
        private LocalDateTime newestVersion;

        // Getters and Setters
        public Integer getTotalVersions() { return totalVersions; }
        public void setTotalVersions(Integer totalVersions) { this.totalVersions = totalVersions; }

        public Integer getCurrentVersion() { return currentVersion; }
        public void setCurrentVersion(Integer currentVersion) { this.currentVersion = currentVersion; }

        public Long getTotalVersionSize() { return totalVersionSize; }
        public void setTotalVersionSize(Long totalVersionSize) { this.totalVersionSize = totalVersionSize; }

        public Long getAverageVersionSize() { return averageVersionSize; }
        public void setAverageVersionSize(Long averageVersionSize) { this.averageVersionSize = averageVersionSize; }

        public LocalDateTime getOldestVersion() { return oldestVersion; }
        public void setOldestVersion(LocalDateTime oldestVersion) { this.oldestVersion = oldestVersion; }

        public LocalDateTime getNewestVersion() { return newestVersion; }
        public void setNewestVersion(LocalDateTime newestVersion) { this.newestVersion = newestVersion; }
    }
}