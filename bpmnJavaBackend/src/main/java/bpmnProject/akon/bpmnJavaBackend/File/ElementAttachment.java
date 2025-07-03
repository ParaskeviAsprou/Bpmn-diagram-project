package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "element_attachments")
public class ElementAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Reference to the main BPMN file
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_file_id", nullable = false)
    @JsonIgnore
    private File parentFile;

    // BPMN element ID that this attachment belongs to
    @Column(name = "element_id", nullable = false)
    private String elementId;

    // BPMN element type (task, event, gateway, etc.)
    @Column(name = "element_type")
    private String elementType;

    // Attachment metadata
    @Column(name = "attachment_name", nullable = false)
    private String attachmentName;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    @Column(name = "updated_by")
    private String updatedBy;

    // File data
    @Lob
    @Column(name = "attachment_data", columnDefinition = "LONGBLOB")
    @JsonIgnore
    private byte[] attachmentData;

    // For categorizing attachments
    @Column(name = "attachment_category")
    @Enumerated(EnumType.STRING)
    private AttachmentCategory category = AttachmentCategory.DOCUMENT;

    // Visibility settings
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false;

    @Column(name = "is_downloadable", nullable = false)
    private Boolean isDownloadable = true;

    // Transient fields
    @Transient
    private String base64Data;

    @Transient
    private String downloadUrl;

    // Constructors
    public ElementAttachment() {
        this.category = AttachmentCategory.DOCUMENT;
        this.isPublic = false;
        this.isDownloadable = true;
    }

    public ElementAttachment(File parentFile, String elementId, String attachmentName, String originalFilename) {
        this();
        this.parentFile = parentFile;
        this.elementId = elementId;
        this.attachmentName = attachmentName;
        this.originalFilename = originalFilename;
        this.createdTime = LocalDateTime.now();
    }

    // =================== GETTERS AND SETTERS ===================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public File getParentFile() {
        return parentFile;
    }

    public void setParentFile(File parentFile) {
        this.parentFile = parentFile;
    }

    public String getElementId() {
        return elementId;
    }

    public void setElementId(String elementId) {
        this.elementId = elementId;
    }

    public String getElementType() {
        return elementType;
    }

    public void setElementType(String elementType) {
        this.elementType = elementType;
    }

    public String getAttachmentName() {
        return attachmentName;
    }

    public void setAttachmentName(String attachmentName) {
        this.attachmentName = attachmentName;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(LocalDateTime createdTime) {
        this.createdTime = createdTime;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getUpdatedTime() {
        return updatedTime;
    }

    public void setUpdatedTime(LocalDateTime updatedTime) {
        this.updatedTime = updatedTime;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public byte[] getAttachmentData() {
        return attachmentData;
    }

    public void setAttachmentData(byte[] attachmentData) {
        this.attachmentData = attachmentData;
        if (attachmentData != null) {
            this.fileSize = (long) attachmentData.length;
        }
    }

    public AttachmentCategory getCategory() {
        return category;
    }

    public void setCategory(AttachmentCategory category) {
        this.category = category;
    }

    public Boolean getIsPublic() {
        return isPublic;
    }

    public void setIsPublic(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    public Boolean getIsDownloadable() {
        return isDownloadable;
    }

    public void setIsDownloadable(Boolean isDownloadable) {
        this.isDownloadable = isDownloadable;
    }

    public String getBase64Data() {
        return base64Data;
    }

    public void setBase64Data(String base64Data) {
        this.base64Data = base64Data;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }

    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    // =================== HELPER METHODS ===================

    public String getFormattedFileSize() {
        if (fileSize == null || fileSize == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(fileSize) / Math.log(1024));
        return Math.round(fileSize / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }

    public String getFileExtension() {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }
        return "";
    }

    public boolean isImageFile() {
        String extension = getFileExtension();
        return extension.matches("jpg|jpeg|png|gif|bmp|svg|webp");
    }

    public boolean isPdfFile() {
        return "pdf".equalsIgnoreCase(getFileExtension());
    }

    public boolean isTextFile() {
        String extension = getFileExtension();
        return extension.matches("txt|md|csv|json|xml|html|css|js|java|py|cpp|c|h");
    }

    @PrePersist
    public void prePersist() {
        if (createdTime == null) {
            createdTime = LocalDateTime.now();
        }
        updatedTime = createdTime;
        if (category == null) {
            category = AttachmentCategory.DOCUMENT;
        }
        if (isPublic == null) {
            isPublic = false;
        }
        if (isDownloadable == null) {
            isDownloadable = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedTime = LocalDateTime.now();
    }

    // Enum for attachment categories
    public enum AttachmentCategory {
        DOCUMENT("Document"),
        IMAGE("Image"),
        SPECIFICATION("Specification"),
        REFERENCE("Reference"),
        TEMPLATE("Template"),
        OTHER("Other");

        private final String displayName;

        AttachmentCategory(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ElementAttachment that = (ElementAttachment) o;
        return id != null ? id.equals(that.id) : that.id == null;
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "ElementAttachment{" +
                "id=" + id +
                ", elementId='" + elementId + '\'' +
                ", attachmentName='" + attachmentName + '\'' +
                ", fileSize=" + fileSize +
                ", category=" + category +
                '}';
    }
}