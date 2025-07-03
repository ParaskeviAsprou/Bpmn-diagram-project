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

    @Column(name = "folder_path", length = 2000)
    private String folderPath;

    @Column(name = "is_root", nullable = false)
    private Boolean isRoot = false;

    // Self-referencing relationship for folder hierarchy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_folder_id")
    @JsonIgnore
    private Folder parentFolder;

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Folder> subFolders = new ArrayList<>();

    // Files in this folder
    @OneToMany(mappedBy = "folder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<File> files = new ArrayList<>();

    // Computed fields
    @Transient
    private Integer fileCount;

    @Transient
    private Integer subFolderCount;

    @Transient
    private Long totalSize;

    // Constructors
    public Folder() {
        this.isRoot = false;
        this.subFolders = new ArrayList<>();
        this.files = new ArrayList<>();
    }

    public Folder(String folderName, String description, String createdBy, Boolean isRoot) {
        this();
        this.folderName = folderName;
        this.description = description;
        this.createdBy = createdBy;
        this.isRoot = isRoot != null ? isRoot : false;
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

    public String getFolderPath() {
        return folderPath;
    }

    public void setFolderPath(String folderPath) {
        this.folderPath = folderPath;
    }

    public Boolean getIsRoot() {
        return isRoot;
    }

    public void setIsRoot(Boolean isRoot) {
        this.isRoot = isRoot;
    }

    public Folder getParentFolder() {
        return parentFolder;
    }

    public void setParentFolder(Folder parentFolder) {
        this.parentFolder = parentFolder;
    }

    public List<Folder> getSubFolders() {
        return subFolders;
    }

    public void setSubFolders(List<Folder> subFolders) {
        this.subFolders = subFolders != null ? subFolders : new ArrayList<>();
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

    public Integer getSubFolderCount() {
        return subFolders != null ? subFolders.size() : 0;
    }

    public void setSubFolderCount(Integer subFolderCount) {
        this.subFolderCount = subFolderCount;
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

    public void addSubFolder(Folder subFolder) {
        if (subFolders == null) {
            subFolders = new ArrayList<>();
        }
        subFolders.add(subFolder);
        subFolder.setParentFolder(this);
        subFolder.setFolderPath(buildFolderPath());
    }

    public void removeSubFolder(Folder subFolder) {
        if (subFolders != null) {
            subFolders.remove(subFolder);
            subFolder.setParentFolder(null);
        }
    }

    public String buildFolderPath() {
        if (parentFolder == null || Boolean.TRUE.equals(isRoot)) {
            return "/" + folderName;
        }
        return parentFolder.buildFolderPath() + "/" + folderName;
    }

    public boolean isSubFolderOf(Folder potentialParent) {
        Folder current = this.parentFolder;
        while (current != null) {
            if (current.equals(potentialParent)) {
                return true;
            }
            current = current.getParentFolder();
        }
        return false;
    }

    @PrePersist
    public void prePersist() {
        if (createdTime == null) {
            createdTime = LocalDateTime.now();
        }
        updatedTime = LocalDateTime.now();
        folderPath = buildFolderPath();
        if (isRoot == null) {
            isRoot = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedTime = LocalDateTime.now();
        folderPath = buildFolderPath();
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
                ", isRoot=" + isRoot +
                ", createdTime=" + createdTime +
                '}';
    }
}