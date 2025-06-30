package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "element_attachments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "parentFile")
@ToString(exclude = "parentFile")
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
    @Builder.Default
    private AttachmentCategory category = AttachmentCategory.DOCUMENT;

    // Visibility settings
    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = false;

    @Column(name = "is_downloadable", nullable = false)
    @Builder.Default
    private Boolean isDownloadable = true;

    // Transient fields
    @Transient
    private String base64Data;

    @Transient
    private String downloadUrl;

    // Helper methods
    public String getFormattedFileSize() {
        if (fileSize == null || fileSize == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(fileSize) / Math.log(1024));
        return Math.round(fileSize / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }

    public void setAttachmentData(byte[] data) {
        this.attachmentData = data;
        if (data != null) {
            this.fileSize = (long) data.length;
        }
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
}