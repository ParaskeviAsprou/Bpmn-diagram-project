package bpmnProject.akon.bpmnJavaBackend.File;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_versions")
public class FileVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_file_id", nullable = false)
    private Long originalFileId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber = 1;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "file_size")
    private Integer fileSize;

    @Column(name = "file_data", columnDefinition = "LONGTEXT")
    private String fileData;

    @Column(name = "xml", columnDefinition = "LONGTEXT")
    private String xml;

    @Column(name = "version_notes", columnDefinition = "TEXT")
    private String versionNotes;

    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = false;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "custom_properties", columnDefinition = "JSON")
    private String customProperties;

    @Column(name = "element_colors", columnDefinition = "JSON")
    private String elementColors;

    @PrePersist
    public void prePersist() {
        if (this.versionNumber == null) {
            this.versionNumber = 1;
        }
        if (this.isCurrent == null) {
            this.isCurrent = false;
        }
        if (this.createdTime == null) {
            this.createdTime = LocalDateTime.now();
        }
        if (this.customProperties == null) {
            this.customProperties = "{}";
        }
        if (this.elementColors == null) {
            this.elementColors = "{}";
        }
    }

    // Constructors
    public FileVersion() {}

    public FileVersion(Long originalFileId, Integer versionNumber, String fileName, String xml) {
        this.originalFileId = originalFileId;
        this.versionNumber = versionNumber;
        this.fileName = fileName;
        this.xml = xml;
        this.fileData = xml;
        this.fileSize = xml != null ? xml.length() : 0;
    }

    // =================== GETTERS AND SETTERS ===================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOriginalFileId() {
        return originalFileId;
    }

    public void setOriginalFileId(Long originalFileId) {
        this.originalFileId = originalFileId;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public Integer getFileSize() {
        return fileSize;
    }

    public void setFileSize(Integer fileSize) {
        this.fileSize = fileSize;
    }

    public String getFileData() {
        return fileData;
    }

    public void setFileData(String fileData) {
        this.fileData = fileData;
        if (fileData != null) {
            this.fileSize = fileData.length();
        }
    }

    public String getXml() {
        return xml;
    }

    public void setXml(String xml) {
        this.xml = xml;
    }

    public String getVersionNotes() {
        return versionNotes;
    }

    public void setVersionNotes(String versionNotes) {
        this.versionNotes = versionNotes;
    }

    public Boolean getIsCurrent() {
        return isCurrent;
    }

    public void setIsCurrent(Boolean isCurrent) {
        this.isCurrent = isCurrent;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public LocalDateTime getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(LocalDateTime createdTime) {
        this.createdTime = createdTime;
    }

    public String getCustomProperties() {
        return customProperties;
    }

    public void setCustomProperties(String customProperties) {
        this.customProperties = customProperties;
    }

    public String getElementColors() {
        return elementColors;
    }

    public void setElementColors(String elementColors) {
        this.elementColors = elementColors;
    }

    // =================== COMPATIBILITY METHODS ===================

    /**
     * Compatibility method for legacy code
     */
    public byte[] getData() {
        if (fileData != null) {
            return fileData.getBytes();
        }
        if (xml != null) {
            return xml.getBytes();
        }
        return new byte[0];
    }

    public void setData(byte[] data) {
        if (data != null) {
            this.fileData = new String(data);
            this.fileSize = data.length;
        }
    }

    @Override
    public String toString() {
        return "FileVersion{" +
                "id=" + id +
                ", originalFileId=" + originalFileId +
                ", versionNumber=" + versionNumber +
                ", fileName='" + fileName + '\'' +
                ", fileType='" + fileType + '\'' +
                ", fileSize=" + fileSize +
                ", isCurrent=" + isCurrent +
                ", createdTime=" + createdTime +
                '}';
    }
}