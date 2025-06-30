package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Table(name = "files")
@Entity
@Getter
@Setter
@Data
public class File implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    @Column(name = "updated_by")
    private String updatedBy;

    // Store file data as binary in database
    @Lob
    @Column(name = "file_data", columnDefinition = "LONGBLOB")
    @JsonIgnore // Don't serialize raw data in JSON
    private byte[] data;

    // Folder relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    @JsonIgnore
    private Folder folder;

    // Versioning
    @Column(name = "current_version", nullable = false)
    private Integer currentVersion = 1;

    @OneToMany(mappedBy = "originalFile", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<FileVersion> versions = new ArrayList<>();

    // Element attachments
    @OneToMany(mappedBy = "parentFile", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<ElementAttachment> elementAttachments = new ArrayList<>();

    // Tags for better organization
    @Column(name = "tags", length = 1000)
    private String tags; // Comma-separated tags

    @Column(name = "description", length = 2000)
    private String description;

    // Visibility and access control
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false;

    @Column(name = "is_template", nullable = false)
    private Boolean isTemplate = false;

    // Transient field for base64 representation (not stored in DB)
    @Transient
    private String base64Data;

    // Short link for file access (optional)
    @Column(name = "short_link")
    private String shortLink;

    // Content preview for frontend (transient)
    @Transient
    private String content;

    @Transient
    private String folderPath;

    @Transient
    private Integer attachmentCount;

    @Transient
    private Integer versionCount;

    // Default constructor
    public File() {}

    // Constructor with parameters
    public File(String fileName, String fileType, Long fileSize, byte[] data, LocalDateTime uploadTime) {
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.data = data;
        this.uploadTime = uploadTime;
        this.currentVersion = 1;
    }

    public void setData(byte[] data) {
        this.data = data;
        // Update file size when data is set
        if (data != null) {
            this.fileSize = (long) data.length;
        }
    }

    public String getContent() {
        if (content == null && data != null) {
            // Convert binary data to string for preview
            try {
                content = new String(data, "UTF-8");
            } catch (Exception e) {
                content = "Binary content cannot be displayed as text";
            }
        }
        return content;
    }

    // Folder path getter
    public String getFolderPath() {
        if (folder != null) {
            return folder.getFolderPath();
        }
        return "/";
    }

    // Attachment count getter
    public Integer getAttachmentCount() {
        return elementAttachments != null ? elementAttachments.size() : 0;
    }

    // Version count getter
    public Integer getVersionCount() {
        return versions != null ? versions.size() + 1 : 1; // +1 for current version
    }

    // Helper methods
    public boolean isBpmnFile() {
        return fileName != null && (fileName.endsWith(".bpmn") || fileName.endsWith(".xml")) ||
                fileType != null && fileType.contains("xml");
    }

    public String getFormattedFileSize() {
        if (fileSize == null || fileSize == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(fileSize) / Math.log(1024));
        return Math.round(fileSize / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }

    public List<String> getTagList() {
        if (tags == null || tags.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return List.of(tags.split(","))
                .stream()
                .map(String::trim)
                .filter(tag -> !tag.isEmpty())
                .toList();
    }

    public void setTagList(List<String> tagList) {
        if (tagList == null || tagList.isEmpty()) {
            this.tags = "";
        } else {
            this.tags = String.join(",", tagList);
        }
    }

    // Version management methods
    public FileVersion createNewVersion(byte[] newData, String versionNotes, String createdBy) {
        FileVersion version = FileVersion.builder()
                .originalFile(this)
                .versionNumber(this.currentVersion)
                .fileName(this.fileName)
                .fileType(this.fileType)
                .data(this.data) // Save current data as version
                .fileSize(this.fileSize)
                .createdTime(LocalDateTime.now())
                .createdBy(createdBy)
                .versionNotes(versionNotes)
                .isCurrent(false)
                .build();

        // Update current file with new data
        this.setData(newData);
        this.currentVersion++;
        this.updatedTime = LocalDateTime.now();
        this.updatedBy = createdBy;

        // Add version to list
        this.versions.add(version);

        return version;
    }

    // Element attachment methods
    public void addElementAttachment(ElementAttachment attachment) {
        this.elementAttachments.add(attachment);
        attachment.setParentFile(this);
    }

    public void removeElementAttachment(ElementAttachment attachment) {
        this.elementAttachments.remove(attachment);
        attachment.setParentFile(null);
    }

    public List<ElementAttachment> getAttachmentsForElement(String elementId) {
        return elementAttachments.stream()
                .filter(attachment -> elementId.equals(attachment.getElementId()))
                .toList();
    }

    @PrePersist
    public void prePersist() {
        if (uploadTime == null) {
            uploadTime = LocalDateTime.now();
        }
        updatedTime = uploadTime;
        if (currentVersion == null) {
            currentVersion = 1;
        }
        if (isPublic == null) {
            isPublic = false;
        }
        if (isTemplate == null) {
            isTemplate = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedTime = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "File{" +
                "id=" + id +
                ", fileName='" + fileName + '\'' +
                ", fileType='" + fileType + '\'' +
                ", fileSize=" + fileSize +
                ", uploadTime=" + uploadTime +
                ", currentVersion=" + currentVersion +
                ", folder=" + (folder != null ? folder.getFolderName() : "root") +
                ", shortLink='" + shortLink + '\'' +
                ", dataLength=" + (data != null ? data.length : 0) +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof File)) return false;
        File file = (File) o;
        return id != null && id.equals(file.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}