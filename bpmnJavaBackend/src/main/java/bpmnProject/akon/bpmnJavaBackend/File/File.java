package bpmnProject.akon.bpmnJavaBackend.File;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "files")
public class File {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Transient field for base64 data transfer
    @Transient
    private String base64Data;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize; // Changed to Long for consistency

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime;

    @Column(name = "file_data", columnDefinition = "LONGTEXT")
    private String fileData;

    @Column(name = "xml", columnDefinition = "LONGTEXT")
    private String xml;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "folder_id")
    private Long folderId;

    @Column(name = "tags")
    private String tags;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    @Column(name = "current_version", nullable = false)
    private Integer currentVersion = 1;

    @Column(name = "custom_properties", columnDefinition = "JSON")
    private String customProperties;

    @Column(name = "element_colors", columnDefinition = "JSON")
    private String elementColors;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false;

    // =================== MISSING FIELD - ADD is_template ===================
    @Column(name = "is_template", nullable = false)
    private Boolean isTemplate = false;

    // Relationship with Folder (optional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", insertable = false, updatable = false)
    private Folder folder;

    @PrePersist
    public void prePersist() {
        if (this.currentVersion == null) {
            this.currentVersion = 1;
        }
        if (this.uploadTime == null) {
            this.uploadTime = LocalDateTime.now();
        }
        if (this.updatedTime == null) {
            this.updatedTime = LocalDateTime.now();
        }
        if (this.customProperties == null) {
            this.customProperties = "{}";
        }
        if (this.elementColors == null) {
            this.elementColors = "{}";
        }
        if (this.isPublic == null) {
            this.isPublic = false;
        }
        // =================== ADD is_template DEFAULT ===================
        if (this.isTemplate == null) {
            this.isTemplate = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedTime = LocalDateTime.now();
    }

    // Constructors
    public File() {
        this.isPublic = false; // Default value
        this.isTemplate = false; // Default value
    }

    public File(String fileName, String fileType, String xml) {
        this.fileName = fileName;
        this.fileType = fileType;
        this.xml = xml;
        this.fileData = xml;
        this.fileSize = xml != null ? (long) xml.length() : 0L;
        this.isPublic = false; // Default value
        this.isTemplate = false; // Default value
    }

    // =================== GETTERS AND SETTERS ===================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getFileData() {
        return fileData;
    }

    public void setFileData(String fileData) {
        this.fileData = fileData;
        if (fileData != null) {
            this.fileSize = (long) fileData.length();
        }
    }

    public String getXml() {
        return xml;
    }

    public void setXml(String xml) {
        this.xml = xml;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getFolderId() {
        return folderId;
    }

    public void setFolderId(Long folderId) {
        this.folderId = folderId;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
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

    public LocalDateTime getUploadTime() {
        return uploadTime;
    }

    public void setUploadTime(LocalDateTime uploadTime) {
        this.uploadTime = uploadTime;
    }

    public LocalDateTime getUpdatedTime() {
        return updatedTime;
    }

    public void setUpdatedTime(LocalDateTime updatedTime) {
        this.updatedTime = updatedTime;
    }

    public Integer getCurrentVersion() {
        return currentVersion;
    }

    public void setCurrentVersion(Integer currentVersion) {
        this.currentVersion = currentVersion;
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

    public Boolean getIsPublic() {
        return isPublic;
    }

    public void setIsPublic(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    // =================== ADD is_template GETTER/SETTER ===================
    public Boolean getIsTemplate() {
        return isTemplate;
    }

    public void setIsTemplate(Boolean isTemplate) {
        this.isTemplate = isTemplate;
    }

    public Folder getFolder() {
        return folder;
    }

    public void setFolder(Folder folder) {
        this.folder = folder;
        if (folder != null) {
            this.folderId = folder.getId();
        }
    }

    public String getBase64Data() {
        return base64Data;
    }

    public void setBase64Data(String base64Data) {
        this.base64Data = base64Data;
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
            this.fileSize = (long) data.length;
        }
    }

    // =================== HELPER METHODS ===================

    public boolean isBpmnFile() {
        if (fileName == null) return false;
        String lowerName = fileName.toLowerCase();
        return lowerName.endsWith(".bpmn") || lowerName.endsWith(".xml") ||
                (fileType != null && fileType.contains("xml"));
    }

    @Override
    public String toString() {
        return "File{" +
                "id=" + id +
                ", fileName='" + fileName + '\'' +
                ", fileType='" + fileType + '\'' +
                ", fileSize=" + fileSize +
                ", folderId=" + folderId +
                ", currentVersion=" + currentVersion +
                ", isPublic=" + isPublic +
                ", isTemplate=" + isTemplate +
                ", uploadTime=" + uploadTime +
                ", updatedTime=" + updatedTime +
                '}';
    }
}