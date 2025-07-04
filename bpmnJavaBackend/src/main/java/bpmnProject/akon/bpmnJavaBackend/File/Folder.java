package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "folders")
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "folder_name", nullable = false)
    private String folderName;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    @Column(name = "created_by")
    private String createdBy;

    // Files in this folder
    @OneToMany(mappedBy = "folder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<File> files = new ArrayList<>();

    // Computed fields
    @Transient
    private Integer fileCount;

    @Transient
    private Long totalSize;

    // =================== CONSTRUCTORS ===================

    public Folder() {
        this.files = new ArrayList<>();
    }

    public Folder(String folderName, String description, String createdBy) {
        this();
        this.folderName = folderName;
        this.description = description;
        this.createdBy = createdBy;
        this.createdTime = LocalDateTime.now();
        this.updatedTime = LocalDateTime.now();
    }

    // =================== GETTERS AND SETTERS ===================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFolderName() {
        return folderName;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
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

    public LocalDateTime getUpdatedTime() {
        return updatedTime;
    }

    public void setUpdatedTime(LocalDateTime updatedTime) {
        this.updatedTime = updatedTime;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public List<File> getFiles() {
        return files;
    }

    public void setFiles(List<File> files) {
        this.files = files != null ? files : new ArrayList<>();
    }

    public Integer getFileCount() {
        return files != null ? files.size() : 0;
    }

    public void setFileCount(Integer fileCount) {
        this.fileCount = fileCount;
    }

    public Long getTotalSize() {
        if (files == null) return 0L;
        return files.stream()
                .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0L)
                .sum();
    }

    public void setTotalSize(Long totalSize) {
        this.totalSize = totalSize;
    }

    // =================== HELPER METHODS ===================

    public void addFile(File file) {
        if (files == null) {
            files = new ArrayList<>();
        }
        files.add(file);
        file.setFolder(this);
    }

    public void removeFile(File file) {
        if (files != null) {
            files.remove(file);
            file.setFolder(null);
        }
    }

    @PrePersist
    public void prePersist() {
        if (createdTime == null) {
            createdTime = LocalDateTime.now();
        }
        updatedTime = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedTime = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Folder folder = (Folder) o;
        return id != null ? id.equals(folder.id) : folder.id == null;
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "Folder{" +
                "id=" + id +
                ", folderName='" + folderName + '\'' +
                ", createdTime=" + createdTime +
                ", fileCount=" + getFileCount() +
                '}';
    }
}